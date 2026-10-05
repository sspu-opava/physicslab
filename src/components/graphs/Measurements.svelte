<script lang="ts">
  import type { BodyState, PhysicsDocument, SensorDefinition, MeasurementDefinition, SensorType } from '../../lib/document/types';
  import { sensorPlugin } from '../../lib/measurements/SensorRegistry';
  import { exportMeasurements, type RecordedMeasurement } from '../../lib/measurements/MeasurementRecorder';
  import { graphData, curveColors } from '../../lib/measurements/graph';
  import MeasurementSetup from './MeasurementSetup.svelte';
  let { state: bodyState, time, name, document, selectedBodyId, series, readings, disabled, add, update, remove, clear }: {
    state?: BodyState; time: number; name: string; document: PhysicsDocument; selectedBodyId: string;
    series: RecordedMeasurement[]; readings: Record<string, number | null>; disabled: boolean;
    add: (bodyId: string, type: SensorType, interval: number) => boolean;
    update: (sensor: SensorDefinition, measurement: MeasurementDefinition) => boolean;
    remove: (id: string) => void; clear: () => void;
  } = $props();
  let tab = $state<'values' | 'graph' | 'setup'>('values'), unit = $state('m'), hidden = $state<string[]>([]);
  let units = $derived([...new Set(series.map(s => s.unit))]);
  let activeUnit = $derived(units.includes(unit) ? unit : units[0] ?? 'm');
  let visible = $derived(series.filter(s => s.unit === activeUnit && !hidden.includes(s.id)));
  let plot = $derived(graphData(visible));
  function download(format: 'csv' | 'json') {
    const blob = new Blob([exportMeasurements(series, format)], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' });
    const url = URL.createObjectURL(blob), anchor = window.document.createElement('a');
    anchor.href = url; anchor.download = `physicslab-mereni.${format}`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
</script>
<section class="panel measurements" aria-label="Měření">
  <div class="measurement-tabs">
    <button class:active={tab === 'values'} onclick={() => tab = 'values'}>Hodnoty</button>
    <button class:active={tab === 'graph'} onclick={() => tab = 'graph'}>Grafy</button>
    <button class:active={tab === 'setup'} onclick={() => tab = 'setup'}>Senzory a záznam</button>
    <span class="measurement-note">t = {time.toFixed(3)} s</span>
    <button disabled={!series.some(s => s.values.length)} onclick={() => download('csv')}>CSV</button>
    <button disabled={!series.some(s => s.values.length)} onclick={() => download('json')}>JSON</button>
  </div>
  <div class="measurement-content">
  {#if tab === 'values'}
    <div class="measurement-body-name">{name}</div>
    {#if bodyState}<div class="metrics">{#each [{ label: 'Poloha x', value: bodyState.position.x, unit: 'm' }, { label: 'Poloha y', value: bodyState.position.y, unit: 'm' }, { label: 'Rychlost vx', value: bodyState.velocity.x, unit: 'm/s' }, { label: 'Rychlost vy', value: bodyState.velocity.y, unit: 'm/s' }, { label: 'Rychlost |v|', value: Math.hypot(bodyState.velocity.x, bodyState.velocity.y), unit: 'm/s' }, { label: 'Úhel', value: bodyState.angle, unit: 'rad' }] as metric}<div class="metric"><span>{metric.label}</span><strong>{metric.value.toFixed(3)} <small>{metric.unit}</small></strong></div>{/each}</div>{:else}<p class="empty-state">Vyberte těleso pro zobrazení hodnot.</p>{/if}
    {#if document.sensors.length}<table class="sensor-values"><thead><tr><th>Senzor</th><th>Hodnota</th><th>Jednotka</th></tr></thead><tbody>{#each document.sensors as sensor}<tr><td>{sensor.name}</td><td>{readings[sensor.id]?.toFixed(3) ?? '—'}</td><td>{sensorPlugin(sensor.type).unit}</td></tr>{/each}</tbody></table>{/if}
  {:else if tab === 'setup'}
    <MeasurementSetup {document} {selectedBodyId} {disabled} {add} {update} {remove}/>
  {:else}
    {#if series.length}<div class="graph-controls"><label>Jednotka grafu<select value={activeUnit} onchange={e => unit = e.currentTarget.value}>{#each units as u}<option value={u}>{u}</option>{/each}</select></label>{#each series.filter(s => s.unit === activeUnit) as s}<label style={`--curve:${curveColors[series.indexOf(s) % curveColors.length]}`}><input type="checkbox" checked={!hidden.includes(s.id)} onchange={e => hidden = e.currentTarget.checked ? hidden.filter(id => id !== s.id) : [...hidden, s.id]}/><span class="curve-dot"></span>{s.name}</label>{/each}</div>{/if}
    {#if plot}<svg class="measurement-graph" viewBox="0 0 800 185" role="img" aria-label={`Časový graf měření v ${activeUnit}`}>
      {#each [0,1,2,3,4] as tick}<line x1="55" x2="765" y1={15 + tick * 35} y2={15 + tick * 35} stroke="#2b414f"/><text x="49" y={19 + tick * 35} text-anchor="end">{(plot.max - tick / 4 * (plot.max - plot.min)).toFixed(2)}</text><text x={55 + tick * 177.5} y="174" text-anchor="middle">{(plot.start + tick / 4 * (plot.end - plot.start)).toFixed(2)}</text>{/each}
      <text x="12" y="10">{activeUnit}</text><text x="790" y="174">s</text>
      {#each plot.paths as curve}{@const color = curveColors[series.findIndex(s => s.id === curve.id) % curveColors.length]}<path d={curve.path} fill="none" stroke={color} stroke-width="1.8"/>{#if curve.point}<circle cx={curve.point.x} cy={curve.point.y} r="3" fill={color}/>{/if}{/each}
    </svg>{:else}<p class="empty-state">{series.length ? 'Pro tuto jednotku zatím nejsou vzorky nebo jsou křivky skryté.' : 'Přidejte senzor v záložce Senzory a záznam a spusťte simulaci.'}</p>{/if}
  {/if}
  </div>
  <div class="measurement-footer"><span>{series.reduce((n,s) => n + s.values.length,0)} vzorků · {series.reduce((n,s) => n + s.dropped,0)} starších vypuštěno · Reset / změna scény vymaže záznam. Exportujte při pauze.</span><button disabled={!series.length} onclick={clear}>Vymazat záznam</button></div>
</section>
