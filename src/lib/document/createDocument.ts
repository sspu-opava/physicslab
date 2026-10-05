import type { BodyDefinition, PhysicsDocument } from './types';
import { emptyPhysicsGraph } from '../graph/types';
export function createBody(id: string, shape: 'circle' | 'box', position = { x: 0, y: 4 }): BodyDefinition {
  return { id, name: shape === 'circle' ? 'Koule' : 'Obdélník', type: 'dynamic', position, angle: 0, mass: 1,
    initialVelocity: { x: 0, y: 0 }, initialAngularVelocity: 0, linearDamping: 0, angularDamping: 0.01,
    fixtures: [{ shape: shape === 'circle' ? { type: 'circle', radius: 0.3 } : { type: 'box', width: 1, height: 0.6 }, density: 1, friction: 0.3, restitution: 0.65, category: 1, mask: 65535 }],
    appearance: { fill: '#38a9fa', stroke: '#a0ddff', strokeWidth: 2, opacity: 1 } };
}
export function createDocument(empty = false): PhysicsDocument {
  const now = new Date().toISOString();
  const ground = createBody('ground', 'box', { x: 0, y: -0.2 });
  ground.name = 'Podlaha'; ground.type = 'static'; ground.fixtures[0].shape = { type: 'box', width: 10, height: 0.4 };
  ground.appearance = { fill: '#667782', stroke: '#a5b2b9', strokeWidth: 1, opacity: 1 };
  return { id: 'free-fall', name: 'Volný pád', version: 1,
    world: { gravity: { x: 0, y: -9.81 }, timeScale: 1, pixelsPerMeter: 100, background: '#101e28', backgroundAssetId: null },
    bodies: empty ? [] : [ground, createBody('ball', 'circle')], joints: [], forces: [], fields: [], assets: [], sensors: [], measurements: [], physicsGraph: emptyPhysicsGraph(), createdAt: now, modifiedAt: now };
}
