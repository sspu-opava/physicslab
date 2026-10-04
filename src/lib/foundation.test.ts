import { describe, expect, it } from 'vitest';
import { createDocument } from './document/createDocument';
import { worldToScreen, screenToWorld } from './units/coordinates';
import { SimulationClock } from './simulation/SimulationClock';
import { SimulationCore } from './simulation/SimulationCore';
import { PlanckPhysicsAdapter } from './physics/adapters/PlanckPhysicsAdapter';
describe('Souřadnice', () => {
  it('převádí metry na pixely s obrácenou osou y a zachovává bod při zpětném převodu', () => {
    const view = { origin: { x: 400, y: 600 }, pixelsPerMeter: 100, zoom: 1.5 };
    expect(worldToScreen({ x: 2, y: 3 }, view)).toEqual({ x: 700, y: 150 });
    expect(screenToWorld({ x: 700, y: 150 }, view)).toEqual({ x: 2, y: 3 });
  });
});
describe('Pevný simulační krok', () => {
  it('nezávisí na frekvenci renderování', () => {
    for (const fps of [30, 60, 144]) {
      const clock = new SimulationClock(); let steps = 0;
      for (let i = 0; i < fps; i++) clock.advance(1 / fps, 1, dt => { expect(dt).toBe(1 / 120); steps++; });
      expect(steps).toBe(120); expect(clock.time).toBeCloseTo(1);
    }
  });
  it('podporuje zpomalení a reset akumulátoru', () => {
    const clock = new SimulationClock(); let steps = 0;
    clock.advance(0.1, 0.5, () => steps++); expect(steps).toBe(6);
    clock.reset(); expect(clock.time).toBe(0); expect(clock.alpha).toBe(0);
  });
});
describe('Model a simulace', () => {
  it('vytváří serializovatelný dokument i prázdný svět', () => {
    const document = createDocument(); expect(JSON.parse(JSON.stringify(document))).toEqual(document);
    expect(createDocument(true).bodies).toHaveLength(0);
  });
  it('počítá volný pád, pozastavení, krok a návrat do původní scény', () => {
    const document = createDocument();
    const core = new SimulationCore(new PlanckPhysicsAdapter(), document);
    core.advance(0.1, 1); expect(core.clock.time).toBe(0);
    core.play(); for (let i = 0; i < 5; i++) core.advance(0.1, 1);
    expect(core.current.ball.velocity.y).toBeCloseTo(-4.905, 2);
    expect(core.current.ball.position.y).toBeCloseTo(4 - 0.5 * 9.81 * 0.25, 1);
    expect(document.bodies[1].position.y).toBe(4);
    core.pause(); const y = core.current.ball.position.y; core.advance(0.1, 1); expect(core.current.ball.position.y).toBe(y);
    core.singleStep(); expect(core.current.ball.position.y).toBeLessThan(y);
    core.reset(); expect(core.status).toBe('STOPPED'); expect(core.clock.time).toBe(0); expect(core.current.ball.position.y).toBe(4);
  });
  it('koule naráží do podlahy a nepropadne jí', () => {
    const core = new SimulationCore(new PlanckPhysicsAdapter(), createDocument()); core.play();
    for (let i = 0; i < 600; i++) { core.advance(1 / 60, 1); expect(core.current.ball.position.y).toBeGreaterThan(0.27); }
  });
  it('hmotnost i impuls používají skutečné jednotky', () => {
    const adapter = new PlanckPhysicsAdapter(), document = createDocument(); adapter.initialize(document.world);
    const ball = document.bodies[1]; ball.mass = 2; adapter.createBody(ball);
    adapter.applyImpulse(ball.id, { x: 6, y: 0 }); expect(adapter.getBodyState(ball.id).velocity.x).toBeCloseTo(3);
  });
});
