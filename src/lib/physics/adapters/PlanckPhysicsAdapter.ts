import { World, Vec2, Circle, Box, RevoluteJoint, DistanceJoint, PrismaticJoint, WeldJoint, type Joint, type Body } from 'planck';
import type { PhysicsEngineAdapter } from '../PhysicsEngineAdapter';
import type { BodyDefinition, BodyState, JointDefinition, Vector2, WorldDefinition } from '../../document/types';
import { validateJoint } from '../joints/joints';
export class PlanckPhysicsAdapter implements PhysicsEngineAdapter {
  private world = new World();
  private bodies = new Map<string, Body>();
  private definitions = new Map<string, BodyDefinition>();
  private joints = new Map<string, Joint>();
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
    this.bodies.set(definition.id, body); this.definitions.set(definition.id, structuredClone(definition)); return definition.id;
  }
  private body(id: string): Body { const body = this.bodies.get(id); if (!body) throw new Error(`Neznámé těleso: ${id}`); return body; }
  removeBody(id: string): void {
    const body = this.body(id);
    for (const [jointId, joint] of this.joints) if (joint.getBodyA() === body || joint.getBodyB() === body) this.removeJoint(jointId);
    this.world.destroyBody(body); this.bodies.delete(id); this.definitions.delete(id);
  }
  createJoint(definition: JointDefinition): string {
    validateJoint(definition, [...this.definitions.values()]);
    if (this.joints.has(definition.id)) throw new Error(`Vazba už existuje: ${definition.id}`);
    if (!definition.enabled) return definition.id;
    const common = { bodyA: this.body(definition.bodyAId), bodyB: this.body(definition.bodyBId), localAnchorA: Vec2(definition.localAnchorA), localAnchorB: Vec2(definition.localAnchorB), collideConnected: definition.collideConnected };
    let joint: Joint;
    if (definition.type === 'distance') joint = new DistanceJoint({ ...common, length: definition.length });
    else if (definition.type === 'revolute') joint = new RevoluteJoint({ ...common, referenceAngle: definition.referenceAngle, enableLimit: definition.enableLimit, lowerAngle: definition.lowerAngle, upperAngle: definition.upperAngle });
    else if (definition.type === 'prismatic') {
      const length = Math.hypot(definition.localAxisA.x, definition.localAxisA.y);
      joint = new PrismaticJoint({ ...common, referenceAngle: definition.referenceAngle, localAxisA: Vec2(definition.localAxisA.x / length, definition.localAxisA.y / length), enableLimit: definition.enableLimit, lowerTranslation: definition.lowerTranslation, upperTranslation: definition.upperTranslation });
    } else joint = new WeldJoint({ ...common, referenceAngle: definition.referenceAngle });
    this.world.createJoint(joint); this.joints.set(definition.id, joint); return definition.id;
  }
  removeJoint(id: string): void { const joint = this.joints.get(id); if (joint) { this.world.destroyJoint(joint); this.joints.delete(id); } }
  applyForce(id: string, force: Vector2, point?: Vector2): void { const b = this.body(id); b.applyForce(Vec2(force.x, force.y), point ? Vec2(point.x, point.y) : b.getWorldCenter(), true); }
  applyImpulse(id: string, impulse: Vector2, point?: Vector2): void { const b = this.body(id); b.applyLinearImpulse(Vec2(impulse.x, impulse.y), point ? Vec2(point.x, point.y) : b.getWorldCenter(), true); }
  setBodyTransform(id: string, position: Vector2, angle: number): void { this.body(id).setTransform(Vec2(position.x, position.y), angle); }
  step(dt: number): void { this.world.step(dt, 8, 3); }
  getBodyState(id: string): BodyState {
    const b = this.body(id), p = b.getPosition(), v = b.getLinearVelocity();
    return { position: { x: p.x, y: p.y }, angle: b.getAngle(), velocity: { x: v.x, y: v.y }, angularVelocity: b.getAngularVelocity(), mass: b.getMass(), inertia: b.getInertia() };
  }
  reset(): void { this.world = new World(); this.bodies.clear(); this.definitions.clear(); this.joints.clear(); }
}
