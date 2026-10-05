import type { PhysicsDocument, SceneState } from '../document/types';
import type { PhysicsEngineAdapter } from '../physics/PhysicsEngineAdapter';
import { SimulationClock } from './SimulationClock';
import { readSensors } from '../measurements/SensorRegistry';
import { MeasurementRecorder } from '../measurements/MeasurementRecorder';
import { applyForces } from '../physics/modules/ForceRegistry';
import { applyFields } from '../physics/modules/FieldRegistry';
export type SimulationStatus = 'STOPPED' | 'RUNNING' | 'PAUSED';
export class SimulationCore {
  status: SimulationStatus = 'STOPPED';
  readonly clock = new SimulationClock();
  previous: SceneState = {};
  current: SceneState = {};
  readings: Record<string, number | null> = {};
  readonly recorder = new MeasurementRecorder();
  private impulsesApplied = false;
  constructor(private adapter: PhysicsEngineAdapter, private document: PhysicsDocument) { this.reset(); }
  reset(document = this.document): void {
    this.document = structuredClone(document); this.status = 'STOPPED'; this.clock.reset(); this.impulsesApplied = false;
    this.adapter.initialize(this.document.world);
    for (const body of this.document.bodies) this.adapter.createBody(body);
    for (const joint of this.document.joints) this.adapter.createJoint(joint);
    this.current = this.snapshot(); this.previous = this.current;
    this.readings = readSensors(this.document, this.current);
    this.recorder.reset(this.document); this.recorder.sample(0, this.readings);
  }
  private snapshot(): SceneState { return Object.fromEntries(this.document.bodies.map(b => [b.id, this.adapter.getBodyState(b.id)])); }
  private step = (dt: number): void => {
    if(!this.impulsesApplied){applyForces(this.document.forces,this.document.bodies,this.current,this.adapter,true);this.impulsesApplied=true;}
    applyForces(this.document.forces,this.document.bodies,this.current,this.adapter);
    applyFields(this.document.fields,this.document.bodies,this.current,this.adapter);
    this.previous = this.current; this.adapter.step(dt); this.current = this.snapshot();
    this.readings = readSensors(this.document, this.current, this.previous, dt);
    this.recorder.sample(this.clock.time + dt, this.readings);
  };
  clearMeasurements(): void { this.recorder.reset(this.document, this.clock.time); this.recorder.sample(this.clock.time, this.readings); }
  play(): void { this.status = 'RUNNING'; }
  pause(): void { if (this.status === 'RUNNING') this.status = 'PAUSED'; }
  singleStep(): void { this.status = 'PAUSED'; this.clock.singleStep(this.step); }
  advance(elapsed: number, scale: number): void { if (this.status === 'RUNNING') this.clock.advance(elapsed, scale, this.step); }
}
