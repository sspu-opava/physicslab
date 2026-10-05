import type { PhysicsDocument } from './types';
import { validateJoint } from '../physics/joints/joints';
import { validateForce } from '../physics/modules/ForceRegistry';
import { validateField } from '../physics/modules/FieldRegistry';
import { validateMeasurement } from '../measurements/MeasurementRecorder';
import { validateSensor } from '../measurements/SensorRegistry';

export const PROJECT_FORMAT = 'physicslab' as const;
export const PROJECT_VERSION = 1;
const MAX_PROJECT_BYTES = 25 * 1024 * 1024;

export interface ProjectFile { format: typeof PROJECT_FORMAT; version: number; document: PhysicsDocument }

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
function vector(value: unknown, label: string): asserts value is { x: number; y: number } {
  if (!record(value) || !finite(value.x) || !finite(value.y)) throw new Error(`${label} musí obsahovat konečné souřadnice x a y.`);
}
function array(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} musí být seznam.`);
}
function uniqueIds(groups: unknown[][]): void {
  const ids = groups.flat().map(item => (item as Record<string, unknown>).id);
  if (ids.some(id => !text(id)) || new Set(ids).size !== ids.length) throw new Error('Všechny objekty musí mít jedinečné neprázdné ID.');
}

export function validateDocument(value: unknown): PhysicsDocument {
  if (!record(value)) throw new Error('Projekt neobsahuje platný dokument.');
  const doc = value as unknown as PhysicsDocument;
  if (!text(doc.id) || !text(doc.name) || !Number.isInteger(doc.version) || doc.version < 1) throw new Error('Dokument nemá platné ID, název nebo verzi.');
  if (!text(doc.createdAt) || !text(doc.modifiedAt)) throw new Error('Dokument nemá platná časová razítka.');
  if (!record(doc.world) || !finite(doc.world.timeScale) || doc.world.timeScale <= 0 || !finite(doc.world.pixelsPerMeter) || doc.world.pixelsPerMeter <= 0 || !text(doc.world.background)) throw new Error('Dokument obsahuje neplatné nastavení světa.');
  vector(doc.world.gravity, 'Gravitace');
  for (const key of ['bodies', 'joints', 'forces', 'fields', 'sensors', 'measurements'] as const) array(doc[key], key);
  uniqueIds([doc.bodies, doc.joints, doc.forces, doc.fields, doc.sensors, doc.measurements]);
  for (const body of doc.bodies) {
    if (!record(body) || !text(body.id) || !text(body.name) || !['static', 'dynamic', 'kinematic'].includes(body.type)) throw new Error('Projekt obsahuje neplatné těleso.');
    vector(body.position, `Poloha tělesa ${body.name}`); vector(body.initialVelocity, `Počáteční rychlost tělesa ${body.name}`);
    if (![body.angle, body.mass, body.linearDamping, body.angularDamping, body.initialAngularVelocity].every(finite) || body.mass <= 0 || body.linearDamping < 0 || body.angularDamping < 0) throw new Error(`Těleso ${body.name} má neplatné parametry.`);
    array(body.fixtures, `Kolize tělesa ${body.name}`);
    if (!body.fixtures.length) throw new Error(`Těleso ${body.name} musí mít alespoň jeden tvar.`);
    for (const fixture of body.fixtures) {
      if (!record(fixture) || !record(fixture.shape) || !finite(fixture.density) || fixture.density < 0 || !finite(fixture.friction) || fixture.friction < 0 || !finite(fixture.restitution) || fixture.restitution < 0 || fixture.restitution > 1 || !Number.isInteger(fixture.category) || !Number.isInteger(fixture.mask)) throw new Error(`Těleso ${body.name} má neplatné fyzikální vlastnosti.`);
      if (fixture.shape.type === 'circle') { if (!finite(fixture.shape.radius) || fixture.shape.radius <= 0) throw new Error(`Těleso ${body.name} má neplatný poloměr.`); }
      else if (fixture.shape.type === 'box') { if (!finite(fixture.shape.width) || fixture.shape.width <= 0 || !finite(fixture.shape.height) || fixture.shape.height <= 0) throw new Error(`Těleso ${body.name} má neplatné rozměry.`); }
      else throw new Error(`Těleso ${body.name} používá neznámý tvar.`);
    }
    if (!record(body.appearance) || !text(body.appearance.fill) || !text(body.appearance.stroke) || !finite(body.appearance.strokeWidth) || body.appearance.strokeWidth < 0 || !finite(body.appearance.opacity) || body.appearance.opacity < 0 || body.appearance.opacity > 1) throw new Error(`Těleso ${body.name} má neplatný vzhled.`);
  }
  for (const joint of doc.joints) {
    if (!record(joint) || !text(joint.id) || !text(joint.name) || typeof joint.enabled !== 'boolean' || typeof joint.collideConnected !== 'boolean' || !['distance', 'revolute', 'prismatic', 'weld'].includes(joint.type)) throw new Error('Projekt obsahuje neplatnou vazbu.');
    validateJoint(joint, doc.bodies);
  }
  for (const force of doc.forces) { if (!record(force) || !text(force.id) || !text(force.name) || typeof force.enabled !== 'boolean' || !Array.isArray(force.targetBodyIds) || !record(force.parameters)) throw new Error('Projekt obsahuje neplatnou sílu.'); validateForce(force, doc.bodies); }
  for (const field of doc.fields) { if (!record(field) || !text(field.id) || !text(field.name) || typeof field.enabled !== 'boolean' || !record(field.parameters)) throw new Error('Projekt obsahuje neplatné pole.'); validateField(field); }
  for (const sensor of doc.sensors) { if (!record(sensor) || !text(sensor.id) || !text(sensor.name) || typeof sensor.enabled !== 'boolean') throw new Error('Projekt obsahuje neplatný senzor.'); validateSensor(sensor, doc); }
  for (const measurement of doc.measurements) { if (!record(measurement) || !text(measurement.id)) throw new Error('Projekt obsahuje neplatné měření.'); validateMeasurement(measurement, doc); }
  return structuredClone(doc);
}

export function migrateProject(value: unknown): PhysicsDocument {
  if (!record(value) || value.format !== PROJECT_FORMAT || !Number.isInteger(value.version)) throw new Error('Soubor není platný projekt PhysicsLab.');
  if ((value.version as number) > PROJECT_VERSION) throw new Error('Projekt byl vytvořen novější verzí aplikace PhysicsLab.');
  if ((value.version as number) < 1) throw new Error('Verze projektu není podporována.');
  let project = value as unknown as ProjectFile;
  const migrations: Record<number, (document: unknown) => unknown> = {};
  // Add a migration at the source version when the file format advances.
  while (project.version < PROJECT_VERSION) {
    const migrate = migrations[project.version];
    if (!migrate) throw new Error(`Verze projektu ${project.version} již není podporována.`);
    project = { ...project, version: project.version + 1, document: migrate(project.document) as PhysicsDocument };
  }
  return validateDocument(project.document);
}

export function serializeProject(document: PhysicsDocument): string {
  const project: ProjectFile = { format: PROJECT_FORMAT, version: PROJECT_VERSION, document: validateDocument(document) };
  const serialized = `${JSON.stringify(project, null, 2)}\n`;
  if (new TextEncoder().encode(serialized).byteLength > MAX_PROJECT_BYTES) throw new Error('Projekt je příliš velký.');
  return serialized;
}

export function deserializeProject(serialized: string): PhysicsDocument {
  if (new TextEncoder().encode(serialized).byteLength > MAX_PROJECT_BYTES) throw new Error('Soubor projektu je příliš velký.');
  let parsed: unknown;
  try { parsed = JSON.parse(serialized); } catch { throw new Error('Soubor projektu neobsahuje platný JSON.'); }
  return migrateProject(parsed);
}
