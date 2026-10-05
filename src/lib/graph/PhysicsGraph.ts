import type { BodyDefinition, SensorDefinition } from '../document/types';
import { mathNodeRegistry } from './MathNodeRegistry';
import type { PhysicsGraphDefinition, PhysicsGraphNode } from './types';
import { isGraphUnit, sameGraphUnit } from './units';
import { sensorPlugin } from '../measurements/SensorRegistry';

export interface GraphForceOutput { bodyId: string; x: number; y: number }
export interface PhysicsGraphResult { measurements: Record<string, number | null>; forces: GraphForceOutput[]; values: Record<string, number | null>; diagnostics: string[] }

const outputNode = (node: PhysicsGraphNode): boolean => node.type === 'sensor' || node.type === 'constant' || node.type === 'math';
function allowedInputs(node: PhysicsGraphNode): readonly string[] {
  if (node.type === 'measurement') return ['value'];
  if (node.type === 'force') return ['x', 'y'];
  if (node.type === 'math') return mathNodeRegistry.find(plugin => plugin.operation === node.operation)?.inputs ?? [];
  return [];
}

export function validatePhysicsGraph(graph: PhysicsGraphDefinition, sensors: readonly SensorDefinition[], bodies: readonly BodyDefinition[]): void {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.connections) || graph.nodes.length > 500 || graph.connections.length > 2000) throw new Error('Graf musí obsahovat platný počet uzlů a propojení.');
  if (graph.nodes.some(node => !node || typeof node !== 'object' || Array.isArray(node)) || graph.connections.some(edge => !edge || typeof edge !== 'object' || Array.isArray(edge))) throw new Error('Graf obsahuje neplatný uzel nebo propojení.');
  const ids = graph.nodes.map(node => node?.id);
  if (ids.some(id => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length) throw new Error('Uzly grafu musí mít jedinečná neprázdná ID.');
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const sensorIds = new Set(sensors.map(sensor => sensor.id)), bodyIds = new Set(bodies.filter(body => body.type === 'dynamic').map(body => body.id));
  for (const node of graph.nodes) {
    if (!['sensor', 'constant', 'math', 'force', 'measurement'].includes(node.type) || typeof node.label !== 'string' || !node.label.trim()) throw new Error('Každý uzel grafu musí mít platný typ a název.');
    if (node.type === 'sensor' && !sensorIds.has(node.sensorId)) throw new Error(`Uzel ${node.label} odkazuje na neexistující senzor.`);
    if (node.type === 'constant' && !Number.isFinite(node.value)) throw new Error(`Konstanta ${node.label} musí být konečné číslo.`);
    if (node.type === 'constant' && (typeof node.unit !== 'string' || !isGraphUnit(node.unit))) throw new Error(`Konstanta ${node.label} má neznámou jednotku.`);
    if (node.type === 'math' && !mathNodeRegistry.some(plugin => plugin.operation === node.operation)) throw new Error(`Uzel ${node.label} má neznámou matematickou operaci.`);
    if (node.type === 'force' && !bodyIds.has(node.bodyId)) throw new Error(`Výstup síly ${node.label} musí cílit na dynamické těleso.`);
    if (node.type === 'measurement' && (typeof node.name !== 'string' || !node.name.trim() || typeof node.unit !== 'string' || !node.unit.trim())) throw new Error(`Měření ${node.label} potřebuje název a jednotku.`);
  }
  const inputKeys = new Set<string>(), adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) adjacency.set(node.id, []);
  for (const edge of graph.connections) {
    const from = nodes.get(edge.fromNodeId), to = nodes.get(edge.toNodeId);
    if (typeof edge.id !== 'string' || !edge.id.trim() || typeof edge.input !== 'string' || !from || !to || !outputNode(from) || !allowedInputs(to).includes(edge.input)) throw new Error('Graf obsahuje neplatné propojení portů.');
    const inputKey = `${edge.toNodeId}:${edge.input}`;
    if (inputKeys.has(inputKey)) throw new Error(`Vstup ${edge.input} uzlu ${to.label} je připojen vícekrát.`);
    inputKeys.add(inputKey); adjacency.get(from.id)!.push(to.id);
  }
  if (new Set(graph.connections.map(edge => edge.id)).size !== graph.connections.length) throw new Error('Propojení grafu musí mít jedinečná ID.');
  const indegree = new Map(graph.nodes.map(node => [node.id, 0]));
  for (const destinations of adjacency.values()) for (const destination of destinations) indegree.set(destination, indegree.get(destination)! + 1);
  const queue = [...indegree].filter(([, count]) => count === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length) {
    const id = queue.pop()!; visited++;
    for (const destination of adjacency.get(id)!) { const next = indegree.get(destination)! - 1; indegree.set(destination, next); if (next === 0) queue.push(destination); }
  }
  if (visited !== graph.nodes.length) throw new Error('Graf nesmí obsahovat cyklus.');

  const unitCache = new Map<string, string | null>(), unitStack = new Set<string>();
  const inferUnit = (id: string): string | undefined => {
    if (unitCache.has(id)) return unitCache.get(id) ?? undefined;
    const node = nodes.get(id); if (!node || !outputNode(node) || unitStack.has(id)) return;
    unitStack.add(id);
    let result: string | undefined;
    if (node.type === 'sensor') {
      const sensor = sensors.find(item => item.id === node.sensorId);
      if (sensor) result = sensorPlugin(sensor.type).unit;
    } else if (node.type === 'constant') result = node.unit;
    else if (node.type === 'math') {
      const plugin = mathNodeRegistry.find(item => item.operation === node.operation)!;
      const ports = plugin.inputs.map(port => incomingSource(node.id, port));
      if (ports.every((source): source is string => !!source)) {
        const units = ports.map(source => inferUnit(source));
        if (units.every((unit): unit is string => !!unit)) {
          result = plugin.inferUnit(units);
          if (!result) throw new Error(`Matematický uzel ${node.label} má nekompatibilní jednotky vstupů.`);
        }
      }
    }
    unitStack.delete(id); unitCache.set(id, result ?? null); return result;
  };
  function incomingSource(nodeId: string, input: string): string | undefined { return graph.connections.find(edge => edge.toNodeId === nodeId && edge.input === input)?.fromNodeId; }
  for (const node of graph.nodes) {
    if (node.type === 'measurement') {
      const source = incomingSource(node.id, 'value');
      if (source) { const unit = inferUnit(source); if (unit && !sameGraphUnit(unit, node.unit)) throw new Error(`Měření ${node.name} má jednotku ${node.unit}, ale zdroj používá ${unit}.`); }
    }
    if (node.type === 'force') for (const input of ['x', 'y']) {
      const source = incomingSource(node.id, input);
      if (source) { const unit = inferUnit(source); if (unit && !sameGraphUnit(unit, 'N')) throw new Error(`Vstup ${input} síly ${node.label} vyžaduje jednotku N, zdroj používá ${unit}.`); }
    }
  }
}

export function evaluatePhysicsGraph(graph: PhysicsGraphDefinition, sensorValues: Readonly<Record<string, number | null>>): PhysicsGraphResult {
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const incoming = new Map<string, string>();
  for (const edge of graph.connections) incoming.set(`${edge.toNodeId}:${edge.input}`, edge.fromNodeId);
  const cache = new Map<string, number | null>(), active = new Set<string>();
  const diagnostics: string[] = [];
  const read = (id: string): number | null => {
    if (cache.has(id)) return cache.get(id)!;
    const node = nodes.get(id); if (!node || !outputNode(node) || active.has(id)) return null;
    active.add(id);
    let value: number | null = null;
    if (node.type === 'sensor') value = sensorValues[node.sensorId] ?? null;
    else if (node.type === 'constant') value = node.value;
    else if (node.type === 'math') {
      const plugin = mathNodeRegistry.find(item => item.operation === node.operation)!;
      const values = plugin.inputs.map(port => { const source = incoming.get(`${node.id}:${port}`); return source ? read(source) : null; });
      if (values.every((item): item is number => item !== null && Number.isFinite(item))) {
        try {
          const result = plugin.evaluate(values); value = Number.isFinite(result) ? result : null;
          if (value === null) diagnostics.push(`Uzel ${node.label} vrátil neplatnou číselnou hodnotu.`);
        } catch(error) { diagnostics.push(`Uzel ${node.label}: ${error instanceof Error ? error.message : String(error)}`); }
      }
    }
    active.delete(id); cache.set(id, value); return value;
  };
  const measurements: Record<string, number | null> = {}, forces: GraphForceOutput[] = [];
  for (const node of graph.nodes) {
    if (node.type === 'measurement') {
      const source = incoming.get(`${node.id}:value`), value = source ? read(source) : null;
      measurements[node.id] = value !== null && Number.isFinite(value) ? value : null;
    } else if (node.type === 'force') {
      const xSource = incoming.get(`${node.id}:x`), ySource = incoming.get(`${node.id}:y`);
      const x = xSource ? read(xSource) : 0, y = ySource ? read(ySource) : 0;
      if ((xSource || ySource) && x !== null && y !== null && Number.isFinite(x) && Number.isFinite(y)) forces.push({ bodyId: node.bodyId, x, y });
    }
  }
  const values = Object.fromEntries(cache);
  return { measurements, forces, values, diagnostics };
}
