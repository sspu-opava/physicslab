import { createBody, createDocument } from '../document/createDocument';
import { createJoint } from '../physics/joints/joints';
import type { ForceDefinition, PhysicsDocument, SensorType } from '../document/types';
import type { ExperimentDefinition, ExperimentControlDefinition } from './types';

const control = (id: string, label: string, unit: string, min: number, max: number, step: number, target: ExperimentControlDefinition['target']): ExperimentControlDefinition => ({ id, label, unit, min, max, step, target });
function base(name: string): PhysicsDocument {
  const doc = createDocument(true); doc.name = name; doc.world.gravity = { x: 0, y: -9.81 }; return doc;
}
function floor(doc: PhysicsDocument, width = 12): void {
  const ground = createBody('ground', 'box', { x: 0, y: -0.25 }); ground.name = 'Podlaha'; ground.type = 'static';
  ground.fixtures[0].shape = { type: 'box', width, height: 0.5 }; ground.fixtures[0].friction = 0.65; ground.fixtures[0].restitution = 0.15;
  ground.appearance = { fill: '#667782', stroke: '#a5b2b9', strokeWidth: 1, opacity: 1 }; doc.bodies.push(ground);
}
function sensors(doc: PhysicsDocument, bodyIds: string[], types: SensorType[] = ['x', 'y', 'vx', 'vy']): void {
  for (const bodyId of bodyIds) for (const type of types) {
    const id = `sensor-${bodyId}-${type}`; doc.sensors.push({ id, name: `${doc.bodies.find(body => body.id === bodyId)?.name ?? bodyId} · ${type}`, type, enabled: true, bodyId });
    doc.measurements.push({ id: `measurement-${bodyId}-${type}`, sensorId: id, sampleInterval: 1 / 30, maxSamples: 1800 });
  }
}
const definitions: ExperimentDefinition[] = [];

{
  const doc = base('Volný pád'); floor(doc); const ball = createBody('falling-ball', 'circle', { x: 0, y: 6 }); ball.name = 'Padající koule'; ball.fixtures[0].restitution = 0.35; doc.bodies.push(ball); sensors(doc, [ball.id]);
  definitions.push({ id: 'free-fall', name: 'Volný pád', category: 'Mechanika', description: 'Sledujte, jak gravitace mění polohu a rychlost tělesa. Porovnejte průběh při různém gravitačním zrychlení.', sceneTemplate: doc, controls: [control('gravity', 'Gravitace', 'm/s²', 0, 20, 0.1, { kind: 'gravityY' }), control('height', 'Počáteční výška', 'm', 2, 9, 0.1, { kind: 'bodyPositionY', bodyId: ball.id }), control('mass', 'Hmotnost', 'kg', 0.2, 5, 0.1, { kind: 'bodyMass', bodyId: ball.id })], measurements: ball.id ? [`sensor-${ball.id}-y`, `sensor-${ball.id}-vy`] : [] });
}
{
  const doc = base('Vrh šikmý'); floor(doc, 20); const ball = createBody('projectile', 'circle', { x: -7, y: 0.4 }); ball.name = 'Projektil'; ball.initialVelocity = { x: 8, y: 7 }; ball.fixtures[0].restitution = 0.1; doc.bodies.push(ball); sensors(doc, [ball.id]);
  definitions.push({ id: 'projectile', name: 'Vrh šikmý', category: 'Mechanika', description: 'Zkoumejte nezávislý vodorovný a svislý pohyb projektilu a jeho trajektorii.', sceneTemplate: doc, controls: [control('velocity-x', 'Rychlost vodorovně', 'm/s', 1, 15, 0.1, { kind: 'bodyVelocityX', bodyId: ball.id }), control('velocity-y', 'Rychlost vzhůru', 'm/s', 0, 12, 0.1, { kind: 'bodyVelocityY', bodyId: ball.id }), control('gravity', 'Gravitace', 'm/s²', 0, 20, 0.1, { kind: 'gravityY' })], measurements: [`sensor-${ball.id}-x`, `sensor-${ball.id}-y`] });
}
{
  const doc = base('Jednoduché kyvadlo'); const pivot = createBody('pivot', 'circle', { x: 0, y: 4 }); pivot.name = 'Závěs'; pivot.type = 'static'; pivot.fixtures[0].shape = { type: 'circle', radius: 0.12 }; pivot.appearance = { fill: '#f0c36d', stroke: '#ffe1a0', strokeWidth: 2, opacity: 1 };
  const bob = createBody('pendulum-bob', 'circle', { x: 1.7, y: 1.8 }); bob.name = 'Závaží'; bob.fixtures[0].shape = { type: 'circle', radius: 0.34 }; bob.appearance.fill = '#fa7969'; doc.bodies.push(pivot, bob); doc.joints.push(createJoint('revolute', pivot, bob, 'pendulum-joint', pivot.position)); sensors(doc, [bob.id], ['x', 'y', 'vx', 'vy', 'angle']);
  definitions.push({ id: 'pendulum', name: 'Jednoduché kyvadlo', category: 'Mechanika', description: 'Uvolněte závaží z různých počátečních výchylek a sledujte periodický pohyb.', sceneTemplate: doc, controls: [control('initial-x', 'Počáteční výchylka', 'm', 0.3, 2.4, 0.05, { kind: 'bodyPositionX', bodyId: bob.id }), control('mass', 'Hmotnost závaží', 'kg', 0.2, 5, 0.1, { kind: 'bodyMass', bodyId: bob.id }), control('gravity', 'Gravitace', 'm/s²', 0, 20, 0.1, { kind: 'gravityY' })], measurements: [`sensor-${bob.id}-x`, `sensor-${bob.id}-y`] });
}
{
  const doc = base('Pružinový oscilátor');
  doc.world.gravity = { x: 0, y: 0 };
  const anchor = createBody('spring-anchor', 'box', { x: -2, y: 2 }); anchor.name = 'Upevnění'; anchor.type = 'static'; anchor.fixtures[0].shape = { type: 'box', width: 0.25, height: 0.25 };
  const mass = createBody('spring-mass', 'box', { x: 0, y: 2 }); mass.name = 'Závaží'; mass.initialVelocity = { x: 1.5, y: 0 }; mass.fixtures[0].shape = { type: 'box', width: 0.65, height: 0.65 }; mass.appearance.fill = '#8bd49b'; doc.bodies.push(anchor, mass);
  const spring: ForceDefinition = { id: 'oscillator-spring', name: 'Pružina', type: 'spring', enabled: true, targetBodyIds: [anchor.id, mass.id], parameters: { restLength: 2, stiffness: 8, damping: 0.15 } };
  doc.forces.push(spring); sensors(doc, [mass.id], ['x', 'vx', 'kinetic']);
  definitions.push({ id: 'spring-oscillator', name: 'Pružinový oscilátor', category: 'Mechanika', description: 'Měňte tuhost pružiny a pozorujte vliv na periodu kmitání závaží.', sceneTemplate: doc, controls: [control('stiffness', 'Tuhost pružiny', 'N/m', 1, 30, 0.5, { kind: 'springStiffness', forceId: spring.id }), control('mass', 'Hmotnost', 'kg', 0.2, 5, 0.1, { kind: 'bodyMass', bodyId: mass.id }), control('gravity', 'Gravitace', 'm/s²', 0, 20, 0.1, { kind: 'gravityY' })], measurements: [`sensor-${mass.id}-x`, `sensor-${mass.id}-vx`] });
}
{
  const doc = base('Srážka těles'); floor(doc, 14); const left = createBody('collision-a', 'circle', { x: -2, y: 0.35 }); left.name = 'Těleso A'; left.initialVelocity = { x: 3, y: 0 }; left.fixtures[0].restitution = 0.8; left.appearance.fill = '#66c6ff';
  const right = createBody('collision-b', 'circle', { x: 1.3, y: 0.35 }); right.name = 'Těleso B'; right.initialVelocity = { x: -0.5, y: 0 }; right.fixtures[0].restitution = 0.8; right.appearance.fill = '#fa7969'; doc.bodies.push(left, right); sensors(doc, [left.id, right.id], ['x', 'vx', 'speed', 'kinetic']);
  definitions.push({ id: 'collision', name: 'Srážka těles', category: 'Mechanika', description: 'Porovnejte rychlosti před srážkou a po ní při různých hmotnostech a gravitaci.', sceneTemplate: doc, controls: [control('mass-a', 'Hmotnost A', 'kg', 0.2, 5, 0.1, { kind: 'bodyMass', bodyId: left.id }), control('mass-b', 'Hmotnost B', 'kg', 0.2, 5, 0.1, { kind: 'bodyMass', bodyId: right.id }), control('velocity-a', 'Rychlost A', 'm/s', 0, 6, 0.1, { kind: 'bodyVelocityX', bodyId: left.id })], measurements: [`sensor-${left.id}-vx`, `sensor-${right.id}-vx`] });
}

export const experimentRegistry: readonly ExperimentDefinition[] = definitions;
export function createExperimentDocument(experiment: ExperimentDefinition): PhysicsDocument {
  const document = structuredClone(experiment.sceneTemplate);
  document.id = `experiment-${experiment.id}`;
  document.modifiedAt = new Date().toISOString();
  return document;
}
