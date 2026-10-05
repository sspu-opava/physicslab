import type { BodyDefinition, BodyState, JointDefinition, Vector2, WorldDefinition } from '../document/types';
export interface PhysicsEngineAdapter {
  initialize(world: WorldDefinition): void;
  createBody(definition: BodyDefinition): string;
  removeBody(id: string): void;
  createJoint(definition: JointDefinition): string;
  removeJoint(id: string): void;
  applyForce(id: string, force: Vector2, point?: Vector2): void;
  applyImpulse(id: string, impulse: Vector2, point?: Vector2): void;
  setBodyTransform(id: string, position: Vector2, angle: number): void;
  step(dt: number): void;
  getBodyState(id: string): BodyState;
  getContactPoints(): Vector2[];
  reset(): void;
}
