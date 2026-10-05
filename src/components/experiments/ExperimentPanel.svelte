<script lang="ts">
  import type { ExperimentDefinition } from '../../lib/experiments/types';
  let { experiments, activeId, values, onSelect, onControl, onExit }: {
    experiments: readonly ExperimentDefinition[];
    activeId: string;
    values: Record<string, number>;
    onSelect: (id: string) => void;
    onControl: (id: string, value: number) => void;
    onExit: () => void;
  } = $props();
  let active = $derived(experiments.find(item => item.id === activeId) ?? experiments[0]);
</script>

<aside class="experiment-panel panel" aria-label="Knihovna experimentů">
  <div class="experiment-heading"><span class="eyebrow">LABORATOŘ</span><button onclick={onExit}>← Editor</button></div>
  <label class="experiment-picker">Experiment
    <select value={activeId} onchange={event => onSelect(event.currentTarget.value)}>
      {#each experiments as experiment}<option value={experiment.id}>{experiment.name}</option>{/each}
    </select>
  </label>
  {#if active}
    <section class="experiment-intro">
      <span class="tag">{active.category}</span><h2>{active.name}</h2><p>{active.description}</p>
    </section>
    <section class="experiment-controls" aria-label="Nastavitelné parametry">
      <h3>Ovládací panel</h3>
      {#each active.controls as control (control.id)}
        {@const value = values[control.id] ?? control.min}
        <label class="experiment-control"><span>{control.label}<strong>{value.toFixed(control.step < 0.1 ? 2 : 1)} <small>{control.unit}</small></strong></span>
          <input type="range" min={control.min} max={control.max} step={control.step} value={value} oninput={event => onControl(control.id, Number(event.currentTarget.value))} />
        </label>
      {/each}
    </section>
    <p class="experiment-lock"><span>🔒</span> Scéna je uzamčená. Měnit lze pouze uvedené parametry.</p>
    <div class="experiment-panel-footer"><span>{active.measurements.length} sledované veličiny</span><span>Úprava parametru resetuje běh</span></div>
  {/if}
</aside>
