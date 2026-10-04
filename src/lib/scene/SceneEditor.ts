import type { BodyDefinition, JointDefinition, PhysicsDocument } from '../document/types';
import { validateJoint } from '../physics/joints/joints';
import { CommandHistory, DocumentCommand } from '../history/CommandHistory';

export class SceneEditor {
  readonly history = new CommandHistory();
  document: PhysicsDocument;
  selection: string[] = [];
  private gestureStart?: PhysicsDocument;
  get isEditing(): boolean { return this.gestureStart !== undefined; }
  get hasPendingChanges(): boolean { return !!this.gestureStart && (JSON.stringify(this.gestureStart.bodies) !== JSON.stringify(this.document.bodies) || JSON.stringify(this.gestureStart.joints) !== JSON.stringify(this.document.joints)); }
  constructor(document: PhysicsDocument) { this.document = structuredClone(document); }
  select(id: string, additive = false): void {
    if (!id) { if (!additive) this.selection = []; return; }
    if (![...this.document.bodies, ...this.document.joints].some(object => object.id === id)) return;
    this.selection = additive ? (this.selection.includes(id) ? this.selection.filter(value => value !== id) : [...this.selection, id]) : [id];
  }
  private pruneSelection(): void { this.selection = this.selection.filter(id => [...this.document.bodies, ...this.document.joints].some(object => object.id === id)); }
  private commit(label: string, next: PhysicsDocument): void {
    this.document = this.history.execute(new DocumentCommand(label, this.document, { ...next, modifiedAt: new Date().toISOString() }));
    this.pruneSelection();
  }
  updateBody(body: BodyDefinition): void {
    const bodies = this.document.bodies.map(value => value.id === body.id ? structuredClone(body) : value);
    for (const joint of this.document.joints) validateJoint(joint, bodies);
    if (this.isEditing) this.document = { ...this.document, bodies };
    else if (JSON.stringify(bodies) !== JSON.stringify(this.document.bodies)) this.commit('Změnit vlastnosti', { ...this.document, bodies });
  }
  addBody(body: BodyDefinition): void {
    this.commit('Přidat těleso', { ...this.document, bodies: [...this.document.bodies, body] }); this.selection = [body.id];
  }
  addJoint(joint: JointDefinition): void {
    validateJoint(joint, this.document.bodies);
    this.commit('Přidat vazbu', { ...this.document, joints: [...this.document.joints, joint] }); this.selection = [joint.id];
  }
  updateJoint(joint: JointDefinition): void {
    validateJoint(joint, this.document.bodies);
    const joints = this.document.joints.map(value => value.id === joint.id ? structuredClone(joint) : value);
    if (this.isEditing) this.document = { ...this.document, joints };
    else if (JSON.stringify(joints) !== JSON.stringify(this.document.joints)) this.commit('Změnit vazbu', { ...this.document, joints });
  }
  deleteSelected(): void {
    if (!this.selection.length || this.isEditing) return;
    const ids = new Set(this.selection);
    const sensors = this.document.sensors.filter(sensor => !ids.has(sensor.bodyId));
    const sensorIds = new Set(sensors.map(sensor => sensor.id));
    this.commit('Smazat tělesa', { ...this.document,
      bodies: this.document.bodies.filter(body => !ids.has(body.id)),
      joints: this.document.joints.filter(joint => !ids.has(joint.id) && !ids.has(joint.bodyAId) && !ids.has(joint.bodyBId)),
      forces: this.document.forces.map(force => ({ ...force, targetBodyIds: force.targetBodyIds.filter(id => !ids.has(id)) })),
      sensors, measurements: this.document.measurements.filter(measurement => sensorIds.has(measurement.sensorId)) });
  }
  duplicateSelected(makeId: () => string = () => crypto.randomUUID()): void {
    if (!this.selection.length || this.isEditing) return;
    const copies = this.document.bodies.filter(body => this.selection.includes(body.id)).map(body => {
      const copy = structuredClone(body); copy.id = makeId(); copy.name += ' (kopie)';
      copy.position.x += 0.5; copy.position.y += 0.5; return copy;
    });
    if (!copies.length) return;
    this.commit('Duplikovat tělesa', { ...this.document, bodies: [...this.document.bodies, ...copies] });
    this.selection = copies.map(body => body.id);
  }
  beginGesture(): void { if (!this.isEditing) this.gestureStart = structuredClone(this.document); }
  preview(bodies: BodyDefinition[]): void {
    if (!this.isEditing) return;
    const changes = new Map(bodies.map(body => [body.id, body]));
    this.document = { ...this.document, bodies: this.document.bodies.map(body => changes.get(body.id) ?? body) };
  }
  endGesture(label = 'Transformovat tělesa', cancel = false): void {
    if (!this.gestureStart) return;
    const before = this.gestureStart, after = this.document;
    this.gestureStart = undefined; this.document = before;
    if (!cancel && (JSON.stringify(before.bodies) !== JSON.stringify(after.bodies) || JSON.stringify(before.joints) !== JSON.stringify(after.joints))) this.commit(label, after);
  }
  undo(): void { if (this.isEditing) return; const document = this.history.undo(); if (document) { this.document = document; this.pruneSelection(); } }
  redo(): void { if (this.isEditing) return; const document = this.history.redo(); if (document) { this.document = document; this.pruneSelection(); } }
}
