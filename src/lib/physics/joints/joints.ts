import type { BodyDefinition, BodyState, JointDefinition, JointType, PhysicsDocument, SceneState, Vector2 } from '../../document/types';
export const jointTypes: { type: JointType; name: string; icon: string; description: string }[] = [
  { type: 'revolute', name: 'Otočný kloub', icon: '⦿', description: 'Společná kotva, volné otáčení.' },
  { type: 'distance', name: 'Pevná vzdálenost', icon: '⟷', description: 'Pevná délka mezi dvěma kotvami.' },
  { type: 'prismatic', name: 'Posuvný kloub', icon: '↔', description: 'Pohyb po ose bez otáčení.' },
  { type: 'weld', name: 'Pevné spojení', icon: '⊞', description: 'Pevná vzájemná poloha a úhel.' },
];
export function localToWorld(local: Vector2, body: Pick<BodyState, 'position' | 'angle'>): Vector2 {
  return { x: body.position.x + local.x * Math.cos(body.angle) - local.y * Math.sin(body.angle), y: body.position.y + local.x * Math.sin(body.angle) + local.y * Math.cos(body.angle) };
}
export function worldToLocal(world: Vector2, body: Pick<BodyDefinition, 'position' | 'angle'>): Vector2 {
  const x = world.x - body.position.x, y = world.y - body.position.y;
  return { x: x * Math.cos(body.angle) + y * Math.sin(body.angle), y: -x * Math.sin(body.angle) + y * Math.cos(body.angle) };
}
export function createJoint(type: JointType, a: BodyDefinition, b: BodyDefinition, id: string, anchor = a.position): JointDefinition {
  const base = { id, name: jointTypes.find(item => item.type === type)!.name, enabled: true, bodyAId: a.id, bodyBId: b.id, collideConnected: false,
    localAnchorA: worldToLocal(anchor, a), localAnchorB: worldToLocal(anchor, b) };
  const referenceAngle = b.angle - a.angle;
  if (type === 'distance') return { ...base, type, localAnchorA: { x: 0, y: 0 }, localAnchorB: { x: 0, y: 0 }, length: Math.max(0.05, Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y)) };
  if (type === 'revolute') return { ...base, type, referenceAngle, enableLimit: false, lowerAngle: -Math.PI / 2, upperAngle: Math.PI / 2 };
  if (type === 'prismatic') return { ...base, type, referenceAngle, localAxisA: { x: Math.cos(a.angle), y: -Math.sin(a.angle) }, enableLimit: false, lowerTranslation: -1, upperTranslation: 1 };
  return { ...base, type, referenceAngle };
}
export function validateJoint(joint: JointDefinition, bodies: BodyDefinition[]): void {
  const a = bodies.find(body => body.id === joint.bodyAId), b = bodies.find(body => body.id === joint.bodyBId);
  if (!a || !b) throw new Error('Obě tělesa vazby musí existovat.');
  if (a.id === b.id) throw new Error('Vyberte dvě různá tělesa.');
  if (a.type !== 'dynamic' && b.type !== 'dynamic') throw new Error('Alespoň jedno těleso musí být dynamické.');
  const values = [joint.localAnchorA.x, joint.localAnchorA.y, joint.localAnchorB.x, joint.localAnchorB.y];
  if (joint.type === 'distance') { values.push(joint.length); if (joint.length < 0.05) throw new Error('Délka musí být alespoň 0,05 m.'); }
  else values.push(joint.referenceAngle);
  if (joint.type === 'prismatic') {
    values.push(joint.localAxisA.x, joint.localAxisA.y, joint.lowerTranslation, joint.upperTranslation);
    if (Math.hypot(joint.localAxisA.x, joint.localAxisA.y) < 1e-8) throw new Error('Osa posuvu nesmí být nulová.');
    if (joint.lowerTranslation > joint.upperTranslation) throw new Error('Dolní mez nesmí překročit horní mez.');
  }
  if (joint.type === 'revolute') {
    values.push(joint.lowerAngle, joint.upperAngle);
    if (joint.lowerAngle > joint.upperAngle) throw new Error('Dolní úhel nesmí překročit horní úhel.');
  }
  if (values.some(value => !Number.isFinite(value))) throw new Error('Parametry vazby musí být konečná čísla.');
}
export function jointAnchors(joint: JointDefinition, states: SceneState): { a: Vector2; b: Vector2 } | undefined {
  const a = states[joint.bodyAId], b = states[joint.bodyBId];
  if (!a || !b) return;
  return { a: localToWorld(joint.localAnchorA, a), b: localToWorld(joint.localAnchorB, b) };
}
export function hitTestJoint(document: PhysicsDocument, states: SceneState, point: Vector2, tolerance: number): string | undefined {
  return [...document.joints].reverse().find(joint => {
    const anchors = jointAnchors(joint, states); if (!anchors) return false;
    const segments = [[anchors.a, anchors.b]];
    if (joint.type !== 'distance') segments.push([states[joint.bodyAId].position, anchors.a], [anchors.b, states[joint.bodyBId].position]);
    return segments.some(([a, b]) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / Math.max(1e-12, dx * dx + dy * dy)));
      return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy) <= tolerance;
    });
  })?.id;
}
