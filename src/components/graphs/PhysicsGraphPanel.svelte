<script lang="ts">
  import type { PhysicsDocument } from '../../lib/document/types';
  import type { PhysicsGraphDefinition, PhysicsGraphNode, MathOperation } from '../../lib/graph/types';
  import { mathNodeRegistry } from '../../lib/graph/MathNodeRegistry';
  import { sensorPlugin } from '../../lib/measurements/SensorRegistry';
  import { graphUnits } from '../../lib/graph/units';

  let { document, readings, values, diagnostics, disabled, update }: {
    document: PhysicsDocument;
    readings: Record<string, number | null>;
    values: Record<string, number | null>;
    diagnostics: string[];
    disabled: boolean;
    update: (graph: PhysicsGraphDefinition) => boolean;
  } = $props();

  let sensorId = $state(''), constantValue = $state(1), constantUnit = $state('1'), operation = $state<MathOperation>('add');
  let measurementName = $state('Výsledek'), measurementUnit = $state(''), forceBodyId = $state('');
  let sourceId = $state(''), targetId = $state(''), inputPort = $state('');
  let graph = $derived(document.physicsGraph);
  let sources = $derived(graph.nodes.filter(node => node.type === 'sensor' || node.type === 'constant' || node.type === 'math'));
  let targets = $derived(graph.nodes.filter(node => node.type === 'math' || node.type === 'force' || node.type === 'measurement'));
  let target = $derived(targets.find(node => node.id === targetId) ?? targets[0]);
  let selectedSourceId = $derived(sources.find(node => node.id === sourceId)?.id ?? sources[0]?.id ?? '');
  let selectedTargetId = $derived(target?.id ?? '');
  let inputPorts = $derived(target?.type === 'math' ? (mathNodeRegistry.find(plugin => plugin.operation === target.operation)?.inputs ?? []) : target?.type === 'force' ? ['x', 'y'] : target?.type === 'measurement' ? ['value'] : []);
  let connectedPorts = $derived(new Set(graph.connections.filter(edge => edge.toNodeId === targetId).map(edge => edge.input)));
  let availablePorts = $derived(inputPorts.filter(port => !connectedPorts.has(port)));
  let selectedInputPort = $derived(availablePorts.includes(inputPort) ? inputPort : availablePorts[0] ?? '');

  function commit(next: PhysicsGraphDefinition): void { update(next); }
  function append(node: PhysicsGraphNode): void { commit({ ...graph, nodes: [...graph.nodes, node] }); }
  function addSensor(): void {
    const sensor = document.sensors.find(item => item.id === (sensorId || document.sensors[0]?.id)); if (!sensor) return;
    append({ id: crypto.randomUUID(), type: 'sensor', sensorId: sensor.id, label: `${sensor.name} · ${sensorPlugin(sensor.type).unit}` });
  }
  function addConstant(): void { if (Number.isFinite(constantValue)) append({ id: crypto.randomUUID(), type: 'constant', value: constantValue, unit: constantUnit, label: `Konstanta ${constantValue} ${constantUnit}` }); }
  function addMath(): void { const plugin = mathNodeRegistry.find(item => item.operation === operation); if (plugin) append({ id: crypto.randomUUID(), type: 'math', operation, label: plugin.label }); }
  function addMeasurement(): void {
    const name = measurementName.trim(), unit = measurementUnit.trim(); if (!name || !unit) return;
    append({ id: crypto.randomUUID(), type: 'measurement', name, unit, label: name });
  }
  function addForce(): void {
    const body = document.bodies.find(item => item.id === (forceBodyId || document.bodies.find(candidate => candidate.type === 'dynamic')?.id) && item.type === 'dynamic'); if (!body) return;
    append({ id: crypto.randomUUID(), type: 'force', bodyId: body.id, label: `Síla → ${body.name}` });
  }
  function chooseTarget(id: string): void {
    targetId = id; const candidate = targets.find(node => node.id === id);
    inputPort = candidate?.type === 'force' ? 'x' : candidate?.type === 'math' ? (mathNodeRegistry.find(plugin => plugin.operation === candidate.operation)?.inputs[0] ?? '') : 'value';
  }
  function connect(): void {
    if (!selectedSourceId || !selectedTargetId || !availablePorts.includes(selectedInputPort)) return;
    commit({ ...graph, connections: [...graph.connections, { id: crypto.randomUUID(), fromNodeId: selectedSourceId, toNodeId: selectedTargetId, input: selectedInputPort }] });
  }
  function removeNode(id: string): void {
    commit({ nodes: graph.nodes.filter(node => node.id !== id), connections: graph.connections.filter(edge => edge.fromNodeId !== id && edge.toNodeId !== id) });
  }
  function updateNode(next: PhysicsGraphNode): void { commit({ ...graph, nodes: graph.nodes.map(node => node.id === next.id ? next : node) }); }
  function changeMath(node: Extract<PhysicsGraphNode, { type: 'math' }>, nextOperation: MathOperation): void {
    const plugin = mathNodeRegistry.find(item => item.operation === nextOperation); if (!plugin) return;
    const nextNode = { ...node, operation: nextOperation, label: plugin.label };
    commit({ nodes: graph.nodes.map(item => item.id === node.id ? nextNode : item), connections: graph.connections.filter(edge => edge.toNodeId !== node.id || plugin.inputs.includes(edge.input)) });
  }
  function removeConnection(id: string): void { commit({ ...graph, connections: graph.connections.filter(edge => edge.id !== id) }); }
  function display(value: number | null | undefined, unit = ''): string { return value === null || value === undefined ? '—' : `${value.toFixed(3)} ${unit}`.trim(); }
</script>

<section class="physics-graph-panel" aria-label="Fyzikální datový graf">
  <div class="graph-intro"><strong>Physics Graph</strong><span>Propojte naměřené hodnoty s výpočtem a výstupem.</span></div>
  <div class="graph-add-grid">
    <label>Senzor<select value={sensorId || document.sensors[0]?.id || ''} onchange={event => sensorId = event.currentTarget.value} disabled={disabled || !document.sensors.length}>{#each document.sensors as sensor}<option value={sensor.id}>{sensor.name}</option>{/each}</select><button disabled={disabled || !document.sensors.length} onclick={addSensor}>+ Senzor</button></label>
    <label>Konstanta<input type="number" step="any" bind:value={constantValue} disabled={disabled}/><select bind:value={constantUnit} disabled={disabled}>{#each graphUnits as unit}<option value={unit}>{unit}</option>{/each}</select><button disabled={disabled} onclick={addConstant}>+ Konstanta</button></label>
    <label>Matematická operace<select bind:value={operation} disabled={disabled}>{#each mathNodeRegistry as plugin}<option value={plugin.operation}>{plugin.label}</option>{/each}</select><button disabled={disabled} onclick={addMath}>+ Výpočet</button></label>
    <label>Měření<input bind:value={measurementName} placeholder="Název" disabled={disabled}/><div class="graph-inline"><input bind:value={measurementUnit} placeholder="Jednotka" disabled={disabled}/><button disabled={disabled || !measurementName.trim() || !measurementUnit.trim()} onclick={addMeasurement}>+ Výstup</button></div></label>
    <label>Cílové těleso<select value={forceBodyId || document.bodies.find(body => body.type === 'dynamic')?.id || ''} onchange={event => forceBodyId = event.currentTarget.value} disabled={disabled || !document.bodies.some(body => body.type === 'dynamic')}>{#each document.bodies.filter(body => body.type === 'dynamic') as body}<option value={body.id}>{body.name}</option>{/each}</select><button disabled={disabled || !document.bodies.some(body => body.type === 'dynamic')} onclick={addForce}>+ Silový výstup</button></label>
  </div>
  <div class="graph-connect">
    <strong>Propojení</strong>
    <select value={selectedSourceId} onchange={event => sourceId = event.currentTarget.value} disabled={disabled || !sources.length} aria-label="Zdrojový uzel">{#each sources as node}<option value={node.id}>{node.label}</option>{/each}</select>
    <span>→</span>
    <select value={selectedTargetId} onchange={event => chooseTarget(event.currentTarget.value)} disabled={disabled || !targets.length} aria-label="Cílový uzel">{#each targets as node}<option value={node.id}>{node.label}</option>{/each}</select>
    <select value={selectedInputPort} onchange={event => inputPort = event.currentTarget.value} disabled={disabled || !availablePorts.length} aria-label="Vstupní port">{#each availablePorts as port}<option value={port}>{port}</option>{/each}</select>
    <button disabled={disabled || !sources.length || !availablePorts.length} onclick={connect}>Připojit</button>
  </div>
  <div class="graph-node-list">
    {#each graph.nodes as node (node.id)}
      <article class="graph-node" class:graph-sink={node.type === 'force' || node.type === 'measurement'}>
        <div><span class="graph-node-kind">{node.type === 'sensor' ? 'SENZOR' : node.type === 'constant' ? 'KONSTANTA' : node.type === 'math' ? 'VÝPOČET' : node.type === 'force' ? 'SÍLA' : 'MĚŘENÍ'}</span><strong>{node.label}</strong></div>
        {#if node.type === 'sensor'}<output>{display(readings[node.sensorId], sensorPlugin(document.sensors.find(sensor => sensor.id === node.sensorId)?.type ?? 'x').unit)}</output>
        {:else if node.type === 'constant'}<div class="graph-node-edit"><input type="number" step="any" value={node.value} disabled={disabled} aria-label="Hodnota konstanty" onchange={event => updateNode({ ...node, value: event.currentTarget.valueAsNumber, label: `Konstanta ${event.currentTarget.value} ${node.unit}` })}/><select value={node.unit} disabled={disabled} aria-label="Jednotka konstanty" onchange={event => updateNode({ ...node, unit: event.currentTarget.value, label: `Konstanta ${node.value} ${event.currentTarget.value}` })}>{#each graphUnits as unit}<option value={unit}>{unit}</option>{/each}</select></div>
        {:else if node.type === 'math'}<select class="graph-node-operation" value={node.operation} disabled={disabled} aria-label="Operace uzlu" onchange={event => changeMath(node, event.currentTarget.value as MathOperation)}>{#each mathNodeRegistry as plugin}<option value={plugin.operation}>{plugin.label}</option>{/each}</select><output>{display(values[node.id])}</output>
        {:else if node.type === 'measurement'}<div class="graph-node-edit"><input value={node.name} disabled={disabled} aria-label="Název měření" onchange={event => updateNode({ ...node, name: event.currentTarget.value.trim() || node.name, label: event.currentTarget.value.trim() || node.name })}/><input value={node.unit} disabled={disabled} aria-label="Jednotka měření" onchange={event => updateNode({ ...node, unit: event.currentTarget.value.trim() || node.unit })}/><output>{display(values[node.id], node.unit)}</output></div>
        {:else}<output>{document.bodies.find(body => body.id === node.bodyId)?.name}</output>{/if}
        <button disabled={disabled} aria-label={`Odebrat uzel ${node.label}`} onclick={() => removeNode(node.id)}>×</button>
      </article>
    {/each}
    {#if !graph.nodes.length}<p class="empty-state">Přidejte senzor a matematický uzel, propojte je a zobrazte výsledek.</p>{/if}
  </div>
  {#if graph.connections.length}<div class="graph-connections"><strong>Aktivní propojení</strong>{#each graph.connections as edge (edge.id)}{@const from = graph.nodes.find(node => node.id === edge.fromNodeId)}{@const to = graph.nodes.find(node => node.id === edge.toNodeId)}<div><span>{from?.label} → {to?.label} · {edge.input}</span><button disabled={disabled} aria-label="Odebrat propojení" onclick={() => removeConnection(edge.id)}>×</button></div>{/each}</div>{/if}
  <p class="graph-help">Uzel výpočtu potřebuje všechny své vstupy. Dělení nulou, odmocnina záporného čísla a chybějící měření vrací prázdnou hodnotu. Silový uzel interpretuje vstupy x a y v newtonech.</p>
  {#if diagnostics.length}<div class="graph-diagnostics" role="status"><strong>Moduly s chybou</strong>{#each diagnostics as message}<span>{message}</span>{/each}</div>{/if}
</section>
