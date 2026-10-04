<script lang="ts">
  import type { SimulationStatus } from '../../lib/simulation/SimulationCore';
  let { status, scale, action, setScale, pan, setPan }: { status: SimulationStatus; scale: number; action: (action: string) => void; setScale: (scale: number) => void; pan: boolean; setPan: (pan: boolean) => void } = $props();
</script>
<div class="toolbar">
  <div class="tool-group">
    <button class:active={!pan} onclick={() => setPan(false)} title="Výběr tělesa"><span>↖</span>Vybrat</button>
    <button class:active={pan} onclick={() => setPan(true)} title="Posun plátna"><span>✥</span>Posun</button>
  </div>
  <div class="tool-group simulation-tools">
    <button class="play" class:active={status === 'RUNNING'} disabled={status === 'RUNNING'} onclick={() => action('play')}><span>▶</span>Spustit</button>
    <button disabled={status !== 'RUNNING'} onclick={() => action('pause')}><span>Ⅱ</span>Pauza</button>
    <button disabled={status === 'STOPPED'} onclick={() => action('stop')}><span>■</span>Stop</button>
    <button disabled={status === 'RUNNING'} onclick={() => action('step')}><span>▸│</span>Krok</button>
    <button onclick={() => action('reset')}><span>↻</span>Reset</button>
  </div>
  <label class="time-scale">Rychlost <select value={scale} onchange={e => setScale(Number(e.currentTarget.value))}>{#each [0.1, 0.25, 0.5, 1, 2, 4] as speed}<option value={speed}>{speed} ×</option>{/each}</select></label>
  <span class="engine"><i></i> Planck.js</span>
</div>
