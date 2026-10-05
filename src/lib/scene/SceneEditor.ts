import type { BodyDefinition, JointDefinition, PhysicsDocument, SensorDefinition, MeasurementDefinition } from '../document/types';
import { validateSensor } from '../measurements/SensorRegistry';
import { validateMeasurement } from '../measurements/MeasurementRecorder';
import { validateForce } from '../physics/modules/ForceRegistry';
import { validateField } from '../physics/modules/FieldRegistry';
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
  replaceDocument(document: PhysicsDocument): void {
    if (this.isEditing) this.gestureStart = undefined;
    this.history.clear(); this.document = structuredClone(document); this.selection = [];
  }
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
    for (const force of this.document.forces) validateForce(force,bodies);
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
  addMeasurement(sensor: SensorDefinition, measurement: MeasurementDefinition): void {
    validateSensor(sensor, this.document);
    if (this.document.sensors.some(s => s.id === sensor.id) || this.document.measurements.some(m => m.id === measurement.id)) throw new Error('ID senzoru nebo měření už existuje.');
    if (measurement.sensorId !== sensor.id) throw new Error('Měření musí odkazovat na přidávaný senzor.');
    const next = { ...this.document, sensors: [...this.document.sensors, sensor], measurements: [...this.document.measurements, measurement] };
    validateMeasurement(measurement, next); this.commit('Přidat měření', next);
  }
  updateMeasurement(sensor: SensorDefinition, measurement: MeasurementDefinition): void {
    validateSensor(sensor, this.document);
    if (!this.document.sensors.some(s => s.id === sensor.id) || !this.document.measurements.some(m => m.id === measurement.id && m.sensorId === sensor.id) || measurement.sensorId !== sensor.id) throw new Error('Měření nebo senzor neexistuje.');
    const next = { ...this.document, sensors: this.document.sensors.map(s => s.id === sensor.id ? sensor : s), measurements: this.document.measurements.map(m => m.id === measurement.id ? measurement : m) };
    validateMeasurement(measurement, next);
    if (JSON.stringify(next) !== JSON.stringify(this.document)) this.commit('Změnit měření', next);
  }
  removeMeasurement(id: string): void {
    const measurements = this.document.measurements.filter(m => m.id !== id), sensorId = this.document.measurements.find(m => m.id === id)?.sensorId;
    if (!sensorId) return;
    const sensors = this.document.sensors.filter(s => s.id !== sensorId || measurements.some(m => m.sensorId === s.id));
    this.commit('Smazat měření', { ...this.document, measurements, sensors });
  }
  addForce(force: PhysicsDocument['forces'][number]): void { validateForce(force,this.document.bodies); if(this.document.forces.some(f=>f.id===force.id))throw new Error('ID síly už existuje.'); this.commit('Přidat sílu',{...this.document,forces:[...this.document.forces,force]}); }
  updateForce(force: PhysicsDocument['forces'][number]): void { validateForce(force,this.document.bodies); if(!this.document.forces.some(f=>f.id===force.id))throw new Error('Síla neexistuje.'); this.commit('Změnit sílu',{...this.document,forces:this.document.forces.map(f=>f.id===force.id?structuredClone(force):f)}); }
  removeForce(id:string):void{const forces=this.document.forces.filter(f=>f.id!==id);if(forces.length!==this.document.forces.length)this.commit('Smazat sílu',{...this.document,forces})}
  addField(field: PhysicsDocument['fields'][number]):void{validateField(field);if(this.document.fields.some(f=>f.id===field.id))throw new Error('ID pole už existuje.');this.commit('Přidat pole',{...this.document,fields:[...this.document.fields,field]})}
  updateField(field: PhysicsDocument['fields'][number]):void{validateField(field);if(!this.document.fields.some(f=>f.id===field.id))throw new Error('Pole neexistuje.');this.commit('Změnit pole',{...this.document,fields:this.document.fields.map(f=>f.id===field.id?structuredClone(field):f)})}
  removeField(id:string):void{const fields=this.document.fields.filter(f=>f.id!==id);if(fields.length!==this.document.fields.length)this.commit('Smazat pole',{...this.document,fields})}
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
      forces: this.document.forces.map(force => ({ ...force, targetBodyIds: force.targetBodyIds.filter(id => !ids.has(id)) })).filter(force => (force.type === 'spring' ? force.targetBodyIds.length === 2 : force.targetBodyIds.length > 0) && force.targetBodyIds.some(id => this.document.bodies.find(body=>body.id===id)?.type==='dynamic')),
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
