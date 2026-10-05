import { describe, it, expect } from 'vitest';
import { createDocument } from '../document/createDocument';
import type { PhysicsDocument, SensorType } from '../document/types';
import { SimulationCore } from '../simulation/SimulationCore';
import { PlanckPhysicsAdapter } from '../physics/adapters/PlanckPhysicsAdapter';
import { sensorPlugin } from './SensorRegistry';
import { exportMeasurements, MeasurementRecorder, validateMeasurement } from './MeasurementRecorder';
import { SceneEditor } from '../scene/SceneEditor';
import { graphData } from './graph';

function measured(types: SensorType[] = ['y', 'vy', 'ay'], interval = 0.02): PhysicsDocument {
  const doc = createDocument(); doc.bodies = [doc.bodies[1]];
  doc.sensors = types.map(type => ({ id: type, name: sensorPlugin(type).label, type, bodyId: 'ball', enabled: true }));
  doc.measurements = types.map(type => ({ id: `m-${type}`, sensorId: type, sampleInterval: interval, maxSamples: 5000 }));
  return doc;
}
function run(doc: PhysicsDocument, fps: number, scale = 1) {
  const sim = new SimulationCore(new PlanckPhysicsAdapter(), doc); sim.play();
  for (let i = 0; i < fps; i++) sim.advance(1 / fps, scale);
  return sim;
}
describe('Senzory a fyzikální čas', () => {
  it('vzorkuje stejné fyzikální kroky při 30 i 144 FPS a neakumuluje chybu intervalu', () => {
    const a = run(measured(), 30), b = run(measured(), 144);
    expect(a.recorder.series).toEqual(b.recorder.series);
    const y = a.recorder.series[0]; expect(y.values).toHaveLength(51);
    for (let i = 0; i < y.timestamps.length; i++) { expect(y.timestamps[i]).toBeGreaterThanOrEqual(i * 0.02 - 1e-10); expect(y.timestamps[i] - i * 0.02).toBeLessThan(1/120 + 1e-10); }
    expect(a.readings.ay).toBeCloseTo(-9.81, 9);
    expect(a.readings.vy).toBeCloseTo(-9.81, 9);
  });
  it('pauza nezaznamenává; krok přidá vzorek, reset obnoví t=0 a neurčené zrychlení', () => {
    const doc = measured(['y', 'ay'], 1/120), original = structuredClone(doc), sim = run(doc, 60);
    sim.pause(); const count = sim.recorder.series[0].values.length;
    sim.advance(0.2, 1); expect(sim.recorder.series[0].values).toHaveLength(count);
    sim.singleStep(); expect(sim.recorder.series[0].values).toHaveLength(count+1);
    sim.reset(); expect(sim.recorder.series[0].timestamps).toEqual([0]); expect(sim.readings.ay).toBeNull(); expect(sim.recorder.series[1].values).toEqual([]);
    expect(doc).toEqual(original);
  });
  it('rychlost běhu mění simulační čas, ne interval záznamu; vypnutý senzor má prázdný záznam', () => {
    const doc = measured(['y','vy']); doc.sensors[1].enabled = false;
    const sim = run(doc, 60, 2); expect(sim.clock.time).toBeCloseTo(2); expect(sim.recorder.series[0].values).toHaveLength(101); expect(sim.recorder.series[1].values).toEqual([]); expect(sim.readings.vy).toBeNull();
  });
  it('počítá energie ze skutečné hmotnosti a momentu setrvačnosti, i pro šikmou gravitaci', () => {
    const doc = measured(['kinetic','potential','energy']); const body = doc.bodies[0];
    body.mass = 2; body.initialVelocity = { x:3, y:4 }; body.initialAngularVelocity = 2; doc.world.gravity = { x:2, y:-10 }; body.position.x = 1;
    const sim = new SimulationCore(new PlanckPhysicsAdapter(),doc);
    expect(sim.current.ball.inertia).toBeCloseTo(0.09); expect(sim.readings.kinetic).toBeCloseTo(25.18); expect(sim.readings.potential).toBeCloseTo(76); expect(sim.readings.energy).toBeCloseTo(101.18);
    const box = structuredClone(doc); box.bodies[0].fixtures[0].shape = { type:'box',width:2,height:1 };
    const boxSim = new SimulationCore(new PlanckPhysicsAdapter(),box); expect(boxSim.current.ball.inertia).toBeCloseTo(2*5/12);
  });
  it('omezuje paměť a vymazání za pauzy začne v současném simulačním čase', () => {
    const doc = measured(['y'],0.1); doc.measurements[0].maxSamples = 3;
    const sim = run(doc,60); expect(sim.recorder.series[0].values).toHaveLength(3); expect(sim.recorder.series[0].dropped).toBe(8);
    expect(sim.recorder.series[0].timestamps[0]).toBeCloseTo(0.8);
    sim.pause(); sim.clearMeasurements(); expect(sim.recorder.series[0].timestamps).toEqual([sim.clock.time]); expect(sim.recorder.series[0].dropped).toBe(0);
    sim.singleStep(); expect(sim.recorder.series[0].values).toHaveLength(1);
  });
});
describe('Dokument, export a graf', () => {
  it('tvorba/úpravy/mazání měření mají historii; smazání tělesa uklidí i záznamové definice', () => {
    const doc = createDocument(), editor = new SceneEditor(doc);
    const sensor = { id:'s', name:'Výška', type:'y' as const, enabled:true, bodyId:'ball' }, measurement = { id:'m', sensorId:'s',sampleInterval:0.02 };
    editor.addMeasurement(sensor,measurement); editor.undo(); expect(editor.document.sensors).toEqual([]); editor.redo();
    editor.updateMeasurement({ ...sensor, enabled:false },{...measurement,sampleInterval:0.1}); editor.undo(); expect(editor.document.sensors[0].enabled).toBe(true);
    editor.removeMeasurement('m'); expect(editor.document.sensors).toEqual([]); editor.undo(); editor.select('ball'); editor.deleteSelected(); expect(editor.document.measurements).toEqual([]); editor.undo(); expect(editor.document.measurements).toHaveLength(1);
    expect(() => editor.updateMeasurement(sensor,{...measurement,sampleInterval:0})).toThrow(); expect(editor.document.measurements[0].sampleInterval).toBe(0.02);
  });
  it('CSV escapuje název a JSON zachová data, jednotky, ID a chybějící první zrychlení', () => {
    const doc = measured(['ay']); doc.sensors[0].name = 'Zrychlení, "koule"';
    const sim = run(doc,60), csv = exportMeasurements(sim.recorder.series,'csv'), json = JSON.parse(exportMeasurements(sim.recorder.series,'json'));
    expect(csv).toContain('"Zrychlení, ""koule"""'); expect(csv).toContain('m/s²'); expect(csv.split('\r\n')).toHaveLength(sim.recorder.series[0].values.length+1);
    expect(json.timeUnit).toBe('s'); expect(json.measurements[0].timestamps[0]).toBeGreaterThan(0); expect(json.measurements[0].values).toEqual(sim.recorder.series[0].values);
  });
  it('odmítá neplatné intervaly, limity i reference před změnou záznamu', () => {
    const doc = measured(['y']), m = doc.measurements[0];
    for (const sampleInterval of [0,NaN,Infinity,0.001,61]) expect(() => validateMeasurement({...m,sampleInterval},doc)).toThrow();
    expect(() => validateMeasurement({...m,maxSamples:2.5},doc)).toThrow(); expect(() => validateMeasurement({...m,sensorId:'missing'},doc)).toThrow();
  });
  it('graf zůstane konečný pro konstantní a prázdná data a zachová krátkou špičku při redukci', () => {
    const recorder = new MeasurementRecorder(); recorder.reset(measured(['y']));
    expect(graphData(recorder.series)).toBeNull(); recorder.sample(0,{y:4}); const constant = graphData(recorder.series)!; expect(constant.paths[0].path).not.toMatch(/NaN|Infinity/);
    const s = recorder.series[0]; s.timestamps = Array.from({length:5000},(_,i)=>i/100); s.values = s.timestamps.map(()=>0); s.values[2501]=100;
    const plot = graphData([s])!; expect(plot.max).toBeGreaterThan(100);
    const displayY = plot.paths[0].path.split(' ').map(point => Number(point.split(',')[1]));
    expect(Math.min(...displayY)).toBeLessThan(30); expect(plot.paths[0].path.split(' ').length).toBeLessThan(1500);
  });
});
