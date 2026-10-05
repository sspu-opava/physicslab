import { describe, it, expect } from 'vitest';
import { SceneEditor } from './SceneEditor';
import { createBody, createDocument } from '../document/createDocument';
import { TransformGesture, hitTest, selectInBox } from '../tools/SceneTools';
import { SimulationCore } from '../simulation/SimulationCore';
import { PlanckPhysicsAdapter } from '../physics/adapters/PlanckPhysicsAdapter';
import { createJoint } from '../physics/joints/joints';

describe('Autorská historie', () => {
  it('uloží celé tažení jako jeden příkaz a zrušené tažení neukládá', () => {
    const editor = new SceneEditor(createDocument()); editor.select('ball');
    editor.beginGesture();
    const gesture = new TransformGesture([editor.document.bodies[1]], { x: 0, y: 4 }, 'select');
    for (let x = 0.1; x <= 2; x += 0.1) editor.preview(gesture.update({ x, y: 5 }, 0.1));
    editor.endGesture(); expect(editor.history.canUndo).toBe(true);
    editor.undo(); expect(editor.document.bodies[1].position).toEqual({ x: 0, y: 4 }); expect(editor.history.canUndo).toBe(false);
    editor.redo(); expect(editor.document.bodies[1].position.y).toBe(5);
    editor.beginGesture(); editor.preview(gesture.update({ x: 10, y: 4 }, 0)); editor.endGesture('Přesun', true);
    expect(editor.document.bodies[1].position.y).toBe(5);
  });
  it('duplikuje nezávislé fixtures a po nové změně zruší redo větev', () => {
    const editor = new SceneEditor(createDocument()); editor.select('ball'); editor.duplicateSelected(() => 'copy');
    const copy = editor.document.bodies[2]; expect(copy.position).toEqual({ x: 0.5, y: 4.5 });
    copy.fixtures[0].restitution = 0.1; expect(editor.document.bodies[1].fixtures[0].restitution).toBe(0.65);
    editor.undo(); expect(editor.document.bodies).toHaveLength(2); expect(editor.history.canRedo).toBe(true);
    editor.addBody(createBody('new', 'box')); expect(editor.history.canRedo).toBe(false);
  });
  it('mazání vyčistí reference a undo obnoví model včetně referencí', () => {
    const document = createDocument();
    document.joints = [createJoint('distance', document.bodies[0], document.bodies[1], 'joint')];
    document.sensors = [{ id: 'sensor', name: 'Poloha', type: 'y', enabled: true, bodyId: 'ball' }];
    document.measurements = [{ id: 'measurement', sensorId: 'sensor', sampleInterval: 0.1 }];
    const editor = new SceneEditor(document); editor.select('ball'); editor.deleteSelected();
    expect(editor.document.bodies).toHaveLength(1); expect(editor.document.joints).toHaveLength(0); expect(editor.document.measurements).toHaveLength(0);
    editor.undo(); expect(editor.document).toEqual(document);
  });
  it('simulace neovlivní autorskou historii a reset zachová upravenou geometrii', () => {
    const editor = new SceneEditor(createDocument()); const body = structuredClone(editor.document.bodies[1]);
    body.fixtures[0].shape = { type: 'circle', radius: 0.7 }; editor.updateBody(body);
    const simulation = new SimulationCore(new PlanckPhysicsAdapter(), editor.document);
    simulation.play(); simulation.advance(0.2, 1); simulation.reset(editor.document);
    expect(simulation.current.ball.position.y).toBe(4); editor.undo(); expect(editor.document.bodies[1].fixtures[0].shape).toEqual({ type: 'circle', radius: 0.3 });
    expect(editor.history.canUndo).toBe(false);
  });
});
describe('Nástroje editoru v metrech', () => {
  it('přichycení skupiny zachová vzdálenosti a bere všechny pohyby z původního stavu', () => {
    const a = createBody('a', 'circle', { x: 0.03, y: 1 }), b = createBody('b', 'box', { x: 1.13, y: 1 });
    const gesture = new TransformGesture([a, b], { x: 0.03, y: 1 }, 'select');
    gesture.update({ x: 4, y: 1 }, 0.1);
    const result = gesture.update({ x: 0.26, y: 1.17 }, 0.1);
    expect(result[0].position.x).toBeCloseTo(0.3); expect(result[1].position.x - result[0].position.x).toBeCloseTo(1.1);
    expect(a.position.x).toBe(0.03);
  });
  it('otáčí a mění velikost skupiny kolem společného středu', () => {
    const a = createBody('a', 'box', { x: -1, y: 0 }), b = createBody('b', 'circle', { x: 1, y: 0 });
    const rotated = new TransformGesture([a, b], { x: 1, y: 0 }, 'rotate').update({ x: 0, y: 1 }, 0);
    expect(rotated[0].position.y).toBeCloseTo(-1); expect(rotated[1].angle).toBeCloseTo(Math.PI / 2);
    const resized = new TransformGesture([a, b], { x: 1, y: 0 }, 'resize').update({ x: 2, y: 0 }, 0);
    expect(resized[0].position.x).toBe(-2); expect(resized[1].fixtures[0].shape).toEqual({ type: 'circle', radius: 0.6 });
  });
  it('vybírá otočený obdélník a tělesa úplně obsažená v rámečku', () => {
    const document = createDocument(true), body = createBody('box', 'box', { x: 0, y: 0 }); body.angle = Math.PI / 2; document.bodies = [body];
    const states = { box: { position: body.position, angle: body.angle, velocity: { x: 0, y: 0 }, angularVelocity: 0 } };
    expect(hitTest(document, states, { x: 0, y: 0.4 })?.id).toBe('box'); expect(hitTest(document, states, { x: 0.4, y: 0 })).toBeUndefined();
    expect(selectInBox(document, states, { start: { x: -1, y: 1 }, end: { x: 1, y: -1 } })).toEqual(['box']);
    expect(selectInBox(document, states, { start: { x: -0.1, y: 0.1 }, end: { x: 0.1, y: -0.1 } })).toEqual([]);
  });
});
