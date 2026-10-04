<script lang="ts">
  import { onMount } from 'svelte';
  import type { BodyDefinition, PhysicsDocument, SceneState, Vector2 } from '../../lib/document/types';
  import { PhysicsRenderer } from '../../lib/renderer/PhysicsRenderer';
  import { screenToWorld } from '../../lib/units/coordinates';
  import { hitTestJoint } from '../../lib/physics/joints/joints';
  import { hitTest, selectInBox, TransformGesture, type SceneTool, type SelectionBox } from '../../lib/tools/SceneTools';
  let { document, state: snapshot, selection, select, selectMany, tool, time, snapInterval, editable, editing, gesture }: {
    document: PhysicsDocument; state: SceneState; selection: string[]; select: (id: string, additive?: boolean) => void; selectMany: (ids: string[]) => void;
    tool: SceneTool; time: number; snapInterval: number; editable: boolean; editing: boolean;
    gesture: (action: 'begin' | 'end' | 'cancel', bodies?: BodyDefinition[]) => void;
  } = $props();
  let host: HTMLDivElement;
  let renderer: PhysicsRenderer;
  let grid = $state(true), error = $state(''), zoom = $state(100);
  let ready = $state(false);
  let dragging = false, last = { x: 0, y: 0 }, pointerId: number | undefined;
  let pointerStart = { x: 0, y: 0 }, moved = false;
  let transform: TransformGesture | undefined, box: SelectionBox | undefined, boxSelection: string[] = [];
  onMount(() => {
    let disposed = false, frame = 0;
    renderer = new PhysicsRenderer();
    renderer.initialize(host).then(() => {
      if (disposed) { renderer.destroy(); return; }
      ready = true;
      zoom = Math.round(renderer.view.zoom * 100);
      const draw = () => { renderer.render(document, snapshot, selection, grid, box); frame = requestAnimationFrame(draw); }; draw();
    }).catch(e => { error = `Plátno se nepodařilo inicializovat: ${String(e)}`; });
    return () => { disposed = true; ready = false; cancelAnimationFrame(frame); renderer.destroy(); };
  });
  function worldPoint(e: PointerEvent): Vector2 {
    const bounds = host.getBoundingClientRect(); return screenToWorld({ x: e.clientX - bounds.left, y: e.clientY - bounds.top }, renderer.view);
  }
  function pointerDown(e: PointerEvent) {
    if (!ready || pointerId !== undefined || editing || (e.button !== 0 && e.button !== 1)) return;
    e.preventDefault(); host.focus(); pointerId = e.pointerId; pointerStart = { x: e.clientX, y: e.clientY }; moved = false; host.setPointerCapture(e.pointerId);
    if (tool === 'pan' || e.button === 1) { dragging = true; last = { x: e.clientX, y: e.clientY }; return; }
    const point = worldPoint(e), hit = hitTest(document, snapshot, point);
    if (hit) {
      if (e.shiftKey) { select(hit.id, true); return; }
      const ids = selection.includes(hit.id) ? selection : [hit.id];
      if (!selection.includes(hit.id)) select(hit.id);
      if (editable) {
        transform = new TransformGesture(document.bodies.filter(body => ids.includes(body.id)), point, tool);
        gesture('begin');
      }
    } else {
      const jointId = hitTestJoint(document, snapshot, point, 8 / (renderer.view.zoom * renderer.view.pixelsPerMeter));
      if (jointId) { select(jointId, e.shiftKey); return; }
      boxSelection = e.shiftKey ? [...selection] : [];
      if (!e.shiftKey) select('');
      box = { start: point, end: point };
    }
  }
  function pointerMove(e: PointerEvent) {
    if (pointerId !== e.pointerId || !ready) return;
    if (dragging) { renderer.pan({ x: e.clientX - last.x, y: e.clientY - last.y }); last = { x: e.clientX, y: e.clientY }; }
    else if (transform && editing) {
      moved ||= Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) >= 3;
      if (moved) gesture('begin', transform.update(worldPoint(e), e.altKey ? 0 : snapInterval, e.shiftKey));
    }
    else if (box) box = { ...box, end: worldPoint(e) };
  }
  function finish(cancel = false) {
    if (transform) gesture(cancel ? 'cancel' : 'end');
    if (box && !cancel) selectMany([...new Set([...boxSelection, ...selectInBox(document, snapshot, box)])]);
    transform = undefined; box = undefined; dragging = false;
    const id = pointerId; pointerId = undefined;
    if (id !== undefined && host.hasPointerCapture(id)) host.releasePointerCapture(id);
  }
</script>
<svelte:window onkeydown={e => { if (e.key === 'Escape' && pointerId !== undefined) finish(true); }}/>
<section class="panel canvas-panel">
  <div class="canvas-heading"><span>◇ <strong>{document.name}</strong> <small>Pracovní plocha</small></span><div><label><input type="checkbox" bind:checked={grid}/> Mřížka</label><button disabled={!ready} onclick={() => { renderer.fitToScene(document, snapshot); zoom = Math.round(renderer.view.zoom * 100); }} title="Zobrazit celou scénu">⤢</button><button onclick={() => { if (ready) { renderer.resetView(); zoom = Math.round(renderer.view.zoom * 100); } }} title="Obnovit pohled">⌖</button><span>{zoom} %</span></div></div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (interactive canvas has global keyboard shortcuts) -->
  <div class="canvas-host" class:panning={tool === 'pan'} class:rotating={tool === 'rotate'} class:resizing={tool === 'resize'} bind:this={host} role="application" tabindex="0" aria-label="Fyzikální scéna" onpointerdown={pointerDown} onpointermove={pointerMove} onpointerup={e => { if (e.pointerId === pointerId) { pointerMove(e); finish(); } }} onpointercancel={() => finish(true)} onlostpointercapture={() => { if (pointerId !== undefined) finish(true); }} onwheel={e => { e.preventDefault(); if (!ready || pointerId !== undefined) return; const r = host.getBoundingClientRect(); renderer.zoomAt({ x: e.clientX - r.left, y: e.clientY - r.top }, Math.exp(-e.deltaY * 0.001)); zoom = Math.round(renderer.view.zoom * 100); }}>
    <div class="canvas-overlay"><span class="eyebrow">{document.name}</span><p>t = {time.toFixed(3)} s</p><p>g = {Math.abs(document.world.gravity.y)} m/s²</p></div>
    <div class="axis-key">↑ y <span>→ x</span><small>Svět v metrech</small></div>
    <div class="scale-ruler" style:width={`${document.world.pixelsPerMeter * zoom / 100}px`}><span>1 m</span></div>
    <div class="tool-hint">{tool === 'rotate' ? 'Táhněte okraj tělesa kolem středu · Shift: 15°' : tool === 'resize' ? 'Táhněte okraj tělesa od středu · přesné rozměry v Inspectoru' : tool === 'pan' ? 'Tažením posunete pohled' : 'Táhněte těleso pro přesun · Alt: bez přichycení'}</div>
    {#if error}<div class="canvas-error" role="alert">{error}</div>{/if}
  </div>
</section>

