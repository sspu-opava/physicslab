<script lang="ts">
  import type { SimulationStatus } from '../../lib/simulation/SimulationCore';
  import type { SceneTool } from '../../lib/tools/SceneTools';
  let { status, scale, action, setScale, tool, setTool, editing }: { status: SimulationStatus; scale: number; action: (action: string) => void; setScale: (scale: number) => void; tool: SceneTool; setTool: (tool: SceneTool) => void; editing: boolean } = $props();
</script>
<div class="toolbar">
  <div class="tool-group">
    <button class:active={tool === 'select'} disabled={editing} onclick={() => setTool('select')} title="Výběr a přesun (V)"><span>↖</span>Vybrat</button>
    <button class:active={tool === 'pan'} disabled={editing} onclick={() => setTool('pan')} title="Posun plátna (H)"><span>✥</span>Posun</button>
    <button class:active={tool === 'rotate'} disabled={editing || status !== 'STOPPED'} onclick={() => setTool('rotate')} title="Otáčení tažením od středu (R), Shift: 15°"><span>⟳</span>Otočit</button>
    <button class:active={tool === 'resize'} disabled={editing || status !== 'STOPPED'} onclick={() => setTool('resize')} title="Změna velikosti tažením od středu (S)"><span>⤢</span>Velikost</button>
  </div>
  <div class="tool-group simulation-tools">
    <button class="play" class:active={status === 'RUNNING'} disabled={editing || status === 'RUNNING'} onclick={() => action('play')}><span>▶</span>Spustit</button>
    <button disabled={status !== 'RUNNING'} onclick={() => action('pause')}><span>Ⅱ</span>Pauza</button>
    <button disabled={editing || status === 'STOPPED'} onclick={() => action('stop')}><span>■</span>Stop</button>
    <button disabled={editing || status === 'RUNNING'} onclick={() => action('step')}><span>▸│</span>Krok</button>
    <button disabled={editing} onclick={() => action('reset')}><span>↻</span>Reset</button>
  </div>
  <label class="time-scale">Rychlost <select value={scale} onchange={e => setScale(Number(e.currentTarget.value))}>{#each [0.1, 0.25, 0.5, 1, 2, 4] as speed}<option value={speed}>{speed} ×</option>{/each}</select></label>
  <span class="engine"><i></i> Planck.js</span>
</div>
