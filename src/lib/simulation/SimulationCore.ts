import type { PhysicsDocument, SceneState } from '../document/types';
import type { PhysicsEngineAdapter } from '../physics/PhysicsEngineAdapter';
import { SimulationClock } from './SimulationClock';
export type SimulationStatus = 'STOPPED' | 'RUNNING' | 'PAUSED';
export class SimulationCore {
  status: SimulationStatus = 'STOPPED';
  readonly clock = new SimulationClock();
  previous: SceneState = {};
  current: SceneState = {};
  constructor(private adapter: PhysicsEngineAdapter, private document: PhysicsDocument) { this.reset(); }
  reset(document = this.document): void {
    this.document = structuredClone(document); this.status = 'STOPPED'; this.clock.reset();
    this.adapter.initialize(this.document.world);
    for (const body of this.document.bodies) this.adapter.createBody(body);
    for (const joint of this.document.joints) this.adapter.createJoint(joint);
    this.current = this.snapshot(); this.previous = this.current;
  }
  private snapshot(): SceneState { return Object.fromEntries(this.document.bodies.map(b => [b.id, this.adapter.getBodyState(b.id)])); }
  private step = (dt: number): void => { this.previous = this.current; this.adapter.step(dt); this.current = this.snapshot(); };
  play(): void { this.status = 'RUNNING'; }
  pause(): void { if (this.status === 'RUNNING') this.status = 'PAUSED'; }
  singleStep(): void { this.status = 'PAUSED'; this.clock.singleStep(this.step); }
  advance(elapsed: number, scale: number): void { if (this.status === 'RUNNING') this.clock.advance(elapsed, scale, this.step); }
}
