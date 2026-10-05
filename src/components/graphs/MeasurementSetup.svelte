<script lang="ts">
  import type { PhysicsDocument, SensorDefinition, MeasurementDefinition, SensorType } from '../../lib/document/types';
  import { sensorRegistry } from '../../lib/measurements/SensorRegistry';
  let { document, selectedBodyId, disabled, add, update, remove }: {
    document: PhysicsDocument; selectedBodyId: string; disabled: boolean;
    add: (bodyId: string, type: SensorType, interval: number) => boolean;
    update: (sensor: SensorDefinition, measurement: MeasurementDefinition) => boolean; remove: (id: string) => void;
  } = $props();
  let target = $state(''), quantity = $state<SensorType>('y'), interval = $state(0.02), revision = $state(0);
  let targetId = $derived(document.bodies.some(b => b.id === target) ? target : document.bodies.some(b => b.id === selectedBodyId) ? selectedBodyId : document.bodies[0]?.id ?? '');
  function change(sensor: SensorDefinition, measurement: MeasurementDefinition) { if (!update(sensor, measurement)) revision++; }
</script>
<form class="measurement-create" onsubmit={e => { e.preventDefault(); add(targetId, quantity, interval); }}>
  <label>Těleso senzoru<select disabled={disabled} value={targetId} onchange={e => target = e.currentTarget.value}>{#each document.bodies as body}<option value={body.id}>{body.name}</option>{/each}</select></label>
  <label>Veličina<select disabled={disabled} bind:value={quantity}>{#each sensorRegistry as p}<option value={p.type}>{p.label} [{p.unit}]</option>{/each}</select></label>
  <label>Interval [s]<input aria-label="Interval nového měření" type="number" min={1/120} max="60" step="any" disabled={disabled} bind:value={interval}/></label>
  <button disabled={disabled || !targetId} type="submit">+ Přidat měření</button>
</form>
{#key revision}<div class="measurement-list">{#each document.measurements as measurement (measurement.id)}{@const sensor = document.sensors.find(s => s.id === measurement.sensorId)!}<div class="measurement-row">
  <input aria-label="Název senzoru" value={sensor.name} disabled={disabled} onchange={e => change({ ...sensor, name: e.currentTarget.value }, measurement)}/>
  <label>Zapnuto<input type="checkbox" checked={sensor.enabled} disabled={disabled} onchange={e => change({ ...sensor, enabled: e.currentTarget.checked }, measurement)}/></label>
  <label>Interval [s]<input type="number" aria-label={`Interval ${sensor.name}`} value={measurement.sampleInterval} min={1/120} max="60" step="any" disabled={disabled} onchange={e => change(sensor, { ...measurement, sampleInterval: e.currentTarget.valueAsNumber })}/></label>
  <label>Limit vzorků<input type="number" aria-label={`Limit ${sensor.name}`} value={measurement.maxSamples ?? 5000} min="2" max="20000" step="1" disabled={disabled} onchange={e => change(sensor, { ...measurement, maxSamples: e.currentTarget.valueAsNumber })}/></label>
  <button disabled={disabled} aria-label={`Odstranit ${sensor.name}`} onclick={() => remove(measurement.id)}>×</button>
</div>{/each}</div>{/key}
<p class="measurement-help">Záznam běží se simulací. Zrychlení je změna rychlosti mezi fyzikálními kroky; první hodnota není dostupná. Energie zahrnuje rotaci a homogenní gravitaci, s nulovým potenciálem v počátku.</p>
