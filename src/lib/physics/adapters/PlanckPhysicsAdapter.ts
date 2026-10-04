import { World, Vec2, Circle, Box, type Body } from 'planck';
import type { PhysicsEngineAdapter } from '../PhysicsEngineAdapter';
import type { BodyDefinition, BodyState, Vector2, WorldDefinition } from '../../document/types';
export class PlanckPhysicsAdapter implements PhysicsEngineAdapter {
  private world = new World();
  private bodies = new Map<string, Body>();
  initialize(definition: WorldDefinition): void { this.reset(); this.world.setGravity(Vec2(definition.gravity.x, definition.gravity.y)); }
  createBody(definition: BodyDefinition): string {
    const body = this.world.createBody({ type: definition.type, position: Vec2(definition.position.x, definition.position.y), angle: definition.angle,
      linearVelocity: Vec2(definition.initialVelocity.x, definition.initialVelocity.y), angularVelocity: definition.initialAngularVelocity,
      linearDamping: definition.linearDamping, angularDamping: definition.angularDamping });
    for (const fixture of definition.fixtures) {
      const shape = fixture.shape.type === 'circle' ? Circle(fixture.shape.radius) : Box(fixture.shape.width / 2, fixture.shape.height / 2);
      body.createFixture(shape, { density: fixture.density, friction: fixture.friction, restitution: fixture.restitution, filterCategoryBits: fixture.category, filterMaskBits: fixture.mask });
    }
    if (definition.type === 'dynamic') {
      const mass = { mass: 0, center: Vec2(), I: 0 };
      body.getMassData(mass);
      const ratio = definition.mass / mass.mass;
      body.setMassData({ mass: definition.mass, center: mass.center, I: mass.I * ratio });
    }
    this.bodies.set(definition.id, body); return definition.id;
  }
  private body(id: string): Body { const body = this.bodies.get(id); if (!body) throw new Error(`Neznámé těleso: ${id}`); return body; }
  removeBody(id: string): void { this.world.destroyBody(this.body(id)); this.bodies.delete(id); }
  applyForce(id: string, force: Vector2, point?: Vector2): void { const b = this.body(id); b.applyForce(Vec2(force.x, force.y), point ? Vec2(point.x, point.y) : b.getWorldCenter(), true); }
  applyImpulse(id: string, impulse: Vector2, point?: Vector2): void { const b = this.body(id); b.applyLinearImpulse(Vec2(impulse.x, impulse.y), point ? Vec2(point.x, point.y) : b.getWorldCenter(), true); }
  setBodyTransform(id: string, position: Vector2, angle: number): void { this.body(id).setTransform(Vec2(position.x, position.y), angle); }
  step(dt: number): void { this.world.step(dt, 8, 3); }
  getBodyState(id: string): BodyState {
    const b = this.body(id), p = b.getPosition(), v = b.getLinearVelocity();
    return { position: { x: p.x, y: p.y }, angle: b.getAngle(), velocity: { x: v.x, y: v.y }, angularVelocity: b.getAngularVelocity() };
  }
  reset(): void { this.world = new World(); this.bodies.clear(); }
}
