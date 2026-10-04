<script lang="ts">
  import { onMount } from 'svelte';
  import type { PhysicsDocument, SceneState } from '../../lib/document/types';
  import { PhysicsRenderer } from '../../lib/renderer/PhysicsRenderer';
  import { screenToWorld } from '../../lib/units/coordinates';
  let { document, state: snapshot, selected, select, pan, time }: { document: PhysicsDocument; state: SceneState; selected: string; select: (id: string) => void; pan: boolean; time: number } = $props();
  let host: HTMLDivElement;
  let renderer: PhysicsRenderer;
  let grid = $state(true), error = $state(''), zoom = $state(100);
  let dragging = false, last = { x: 0, y: 0 };
  onMount(() => {
    let disposed = false, frame = 0;
    renderer = new PhysicsRenderer();
    renderer.initialize(host).then(() => {
      if (disposed) { renderer.destroy(); return; }
      zoom = Math.round(renderer.view.zoom * 100);
      const draw = () => { renderer.render(document, snapshot, selected, grid); frame = requestAnimationFrame(draw); }; draw();
    }).catch(e => { error = `Plátno se nepodařilo inicializovat: ${String(e)}`; });
    return () => { disposed = true; cancelAnimationFrame(frame); renderer.destroy(); };
  });
  function pointerDown(e: PointerEvent) {
    if (!renderer) return;
    if (pan || e.button === 1) { dragging = true; last = { x: e.clientX, y: e.clientY }; host.setPointerCapture(e.pointerId); return; }
    const bounds = host.getBoundingClientRect(), point = screenToWorld({ x: e.clientX - bounds.left, y: e.clientY - bounds.top }, renderer.view);
    const hit = [...document.bodies].reverse().find(body => {
      const s = snapshot[body.id]; if (!s) return false;
      const dx = point.x - s.position.x, dy = point.y - s.position.y;
      const x = dx * Math.cos(s.angle) + dy * Math.sin(s.angle), y = -dx * Math.sin(s.angle) + dy * Math.cos(s.angle);
      return body.fixtures.some(f => f.shape.type === 'circle' ? Math.hypot(x, y) <= f.shape.radius : Math.abs(x) <= f.shape.width / 2 && Math.abs(y) <= f.shape.height / 2);
    });
    select(hit?.id ?? '');
  }
</script>
<section class="panel canvas-panel">
  <div class="canvas-heading"><span>◇ <strong>{document.name}</strong> <small>Pracovní plocha</small></span><div><label><input type="checkbox" bind:checked={grid}/> Mřížka</label><button onclick={() => { renderer?.resetView(); zoom = Math.round(renderer.view.zoom * 100); }} title="Obnovit pohled">⌖</button><span>{zoom} %</span></div></div>
  <div class="canvas-host" class:panning={pan} bind:this={host} role="application" aria-label="Fyzikální scéna" onpointerdown={pointerDown} onpointermove={e => { if (dragging) { renderer.pan({ x: e.clientX - last.x, y: e.clientY - last.y }); last = { x: e.clientX, y: e.clientY }; } }} onpointerup={() => dragging = false} onpointercancel={() => dragging = false} onwheel={e => { e.preventDefault(); if (!renderer) return; const r = host.getBoundingClientRect(); renderer.zoomAt({ x: e.clientX - r.left, y: e.clientY - r.top }, Math.exp(-e.deltaY * 0.001)); zoom = Math.round(renderer.view.zoom * 100); }}>
    <div class="canvas-overlay"><span class="eyebrow">{document.name}</span><p>t = {time.toFixed(3)} s</p><p>g = {Math.abs(document.world.gravity.y)} m/s²</p></div>
    <div class="axis-key">↑ y <span>→ x</span><small>Svět v metrech</small></div>
    <div class="scale-ruler" style:width={`${document.world.pixelsPerMeter * zoom / 100}px`}><span>1 m</span></div>
    {#if error}<div class="canvas-error" role="alert">{error}</div>{/if}
  </div>
</section>

