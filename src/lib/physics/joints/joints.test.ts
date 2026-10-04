import { describe, expect, it } from 'vitest';
import { createBody, createDocument } from '../../document/createDocument';
import type { JointType } from '../../document/types';
import { createJoint, jointAnchors, validateJoint, worldToLocal, localToWorld } from './joints';
import { SimulationCore } from '../../simulation/SimulationCore';
import { PlanckPhysicsAdapter } from '../adapters/PlanckPhysicsAdapter';
import { SceneEditor } from '../../scene/SceneEditor';

function scene(type: JointType) {
  const document = createDocument(true), a = createBody('anchor', 'box', { x: 0, y: 4 }), b = createBody('bob', 'circle', { x: 1, y: 2 });
  a.type = 'static'; document.bodies = [a, b]; document.joints = [createJoint(type, a, b, 'joint')];
  return document;
}
function run(type: JointType, configure?: (document: ReturnType<typeof scene>) => void) {
  const document = scene(type); configure?.(document);
  const core = new SimulationCore(new PlanckPhysicsAdapter(), document); core.play();
  for (let i = 0; i < 240; i++) core.advance(1 / 120, 1);
  return { core, document };
}
describe('Fyzikální vazby', () => {
  it('otočný kloub zachová společnou kotvu při pohybu kyvadla', () => {
    const { core, document } = run('revolute');
    const anchors = jointAnchors(document.joints[0], core.current)!;
    expect(Math.hypot(anchors.a.x - anchors.b.x, anchors.a.y - anchors.b.y)).toBeLessThan(0.005);
    expect(core.current.bob.position.x).not.toBeCloseTo(1, 1);
    core.reset(); expect(core.current.bob.position).toEqual({ x: 1, y: 2 });
  });
  it('vzdálenost mezi kotvami zůstává pevná', () => {
    const { core, document } = run('distance'); const anchors = jointAnchors(document.joints[0], core.current)!;
    expect(Math.hypot(anchors.a.x - anchors.b.x, anchors.a.y - anchors.b.y)).toBeCloseTo(Math.sqrt(5), 3);
  });
  it('posuvný kloub zabrání bočnímu pohybu a rotaci a respektuje meze', () => {
    const { core } = run('prismatic', document => {
      const joint = document.joints[0]; if (joint.type !== 'prismatic') throw new Error();
      joint.localAxisA = { x: 0, y: -3 }; joint.enableLimit = true; joint.lowerTranslation = -0.5; joint.upperTranslation = 0.5;
      document.bodies[1].initialVelocity = { x: 3, y: 0 }; document.bodies[1].initialAngularVelocity = 2;
    });
    expect(core.current.bob.position.x).toBeCloseTo(1, 3); expect(core.current.bob.angle).toBeCloseTo(0, 3);
    expect(core.current.bob.position.y).toBeGreaterThan(1.48); expect(core.current.bob.position.y).toBeLessThan(1.55);
  });
  it('pevné spojení zachová polohu i referenční úhel', () => {
    const { core } = run('weld', document => {
      document.bodies[1].angle = 0.4; const joint = document.joints[0]; if (joint.type !== 'weld') throw new Error();
      Object.assign(joint, createJoint('weld', document.bodies[0], document.bodies[1], 'joint'));
    });
    expect(core.current.bob.position.x).toBeCloseTo(1, 3); expect(core.current.bob.position.y).toBeCloseTo(2, 3); expect(core.current.bob.angle).toBeCloseTo(0.4, 3);
  });
  it('otočný kloub respektuje úhlové meze', () => {
    const { core } = run('revolute', document => { const joint = document.joints[0]; if (joint.type === 'revolute') { joint.enableLimit = true; joint.lowerAngle = -0.1; joint.upperAngle = 0.1; } });
    expect(Math.abs(core.current.bob.angle)).toBeLessThan(0.14);
  });
  it('vypnutá vazba nebrání volnému pádu', () => {
    const { core } = run('weld', document => { document.joints[0].enabled = false; });
    expect(core.current.bob.position.y).toBeLessThan(-10);
  });
  it('odstranění vazby uvolní těleso a odstranění tělesa odstraní vazby adaptéru', () => {
    const document = scene('weld'), adapter = new PlanckPhysicsAdapter(); adapter.initialize(document.world);
    document.bodies.forEach(body => adapter.createBody(body)); adapter.createJoint(document.joints[0]);
    adapter.removeJoint('joint'); adapter.step(0.1); expect(adapter.getBodyState('bob').velocity.y).toBeLessThan(0);
    adapter.createJoint(document.joints[0]); adapter.removeBody('bob'); adapter.removeJoint('joint'); expect(() => adapter.step(1 / 120)).not.toThrow();
  });
});
describe('Model vazeb a editor', () => {
  it('převádí místní kotvy pro otočená tělesa bez závislosti na enginu', () => {
    const body = createBody('body', 'circle', { x: 2, y: 3 }); body.angle = Math.PI / 2;
    const local = worldToLocal({ x: 2, y: 5 }, body); expect(local.x).toBeCloseTo(2); expect(local.y).toBeCloseTo(0);
    const world = localToWorld(local, body); expect(world.x).toBeCloseTo(2); expect(world.y).toBeCloseTo(5);
    const document = scene('revolute'); expect(JSON.parse(JSON.stringify(document))).toEqual(document);
  });
  it('odmítne stejná tělesa, neexistující reference, krátkou délku a nulovou osu', () => {
    const document = scene('distance'), joint = document.joints[0]; if (joint.type !== 'distance') throw new Error();
    expect(() => validateJoint({ ...joint, bodyBId: joint.bodyAId }, document.bodies)).toThrow('různá');
    expect(() => validateJoint({ ...joint, bodyBId: 'missing' }, document.bodies)).toThrow('existovat');
    expect(() => validateJoint({ ...joint, length: 0 }, document.bodies)).toThrow('Délka');
    const prism = scene('prismatic'); const j = prism.joints[0]; if (j.type !== 'prismatic') throw new Error();
    expect(() => validateJoint({ ...j, localAxisA: { x: 0, y: 0 } }, prism.bodies)).toThrow('nulová');
  });
  it('tvorba, úprava a smazání vazby jsou vratné a při smazání tělesa nezůstanou reference', () => {
    const document = scene('distance'), joint = document.joints[0]; document.joints = []; const editor = new SceneEditor(document);
    editor.addJoint(joint); expect(editor.selection).toEqual(['joint']);
    const updated = { ...joint, name: 'Spoj' }; editor.updateJoint(updated); editor.undo(); expect(editor.document.joints[0].name).toBe(joint.name);
    editor.select('joint'); editor.deleteSelected(); expect(editor.document.bodies).toHaveLength(2); expect(editor.document.joints).toHaveLength(0);
    editor.undo(); editor.select('bob'); editor.deleteSelected(); expect(editor.document.joints).toHaveLength(0);
    editor.undo(); expect(editor.document.joints).toHaveLength(1);
  });
  it('neplatná změna typu tělesa nebo vazby nezmění dokument ani historii', () => {
    const editor = new SceneEditor(scene('distance')); const before = structuredClone(editor.document);
    expect(() => editor.updateBody({ ...editor.document.bodies[1], type: 'static' })).toThrow('dynamické');
    expect(editor.document).toEqual(before); expect(editor.history.canUndo).toBe(false);
  });
});
