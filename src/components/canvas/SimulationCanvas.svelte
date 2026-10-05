<script lang="ts">
  import { onMount } from 'svelte';
  import type { BodyDefinition, PhysicsDocument, SceneState, Vector2 } from '../../lib/document/types';
  import { PhysicsRenderer, defaultVisualization, type VisualizationOptions } from '../../lib/renderer/PhysicsRenderer';
  import { screenToWorld } from '../../lib/units/coordinates';
  import { hitTestJoint } from '../../lib/physics/joints/joints';
  import AssetManager from '../assets/AssetManager.svelte';
  import { hitTest, selectInBox, TransformGesture, type SceneTool, type SelectionBox } from '../../lib/tools/SceneTools';
  let { document, state: snapshot, contacts, selection, select, selectMany, tool, time, snapInterval, editable, editing, gesture, assetsDisabled, addAsset, removeAsset, setBackgroundAsset }: {
    document: PhysicsDocument; state: SceneState; contacts:{x:number;y:number}[]; selection: string[]; select: (id: string, additive?: boolean) => void; selectMany: (ids: string[]) => void;
    tool: SceneTool; time: number; snapInterval: number; editable: boolean; editing: boolean;
    gesture: (action: 'begin' | 'end' | 'cancel', bodies?: BodyDefinition[]) => void;
    assetsDisabled: boolean; addAsset: (asset: import('../../lib/document/types').ProjectAsset) => void; removeAsset: (assetId: string) => void; setBackgroundAsset: (assetId: string | null) => void;
  } = $props();
  let host: HTMLDivElement;
  let renderer: PhysicsRenderer;
  let grid = $state(true), error = $state(''), zoom = $state(100);
  let visuals=$state<VisualizationOptions>(structuredClone(defaultVisualization));
  let backgroundAsset = $derived(document.assets.find(asset => asset.assetId === document.world.backgroundAssetId));
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
      const draw = () => { renderer.render(document, snapshot, selection, grid, box, visuals, time, contacts); frame = requestAnimationFrame(draw); }; draw();
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
  <div class="canvas-heading"><span>◇ <strong>{document.name}</strong> <small>Pracovní plocha</small></span><div><label><input type="checkbox" bind:checked={grid}/> Mřížka</label><AssetManager {document} disabled={assetsDisabled} add={addAsset} remove={removeAsset} setBackground={setBackgroundAsset}/><details class="visualization-menu"><summary>Vizualizace</summary><div class="visualization-popover">
    <strong>Vektory a značky</strong><label><input type="checkbox" bind:checked={visuals.velocity}/> Rychlost</label><label><input type="checkbox" bind:checked={visuals.acceleration}/> Zrychlení</label><label><input type="checkbox" bind:checked={visuals.gravity}/> Gravitace</label><label><input type="checkbox" bind:checked={visuals.centerOfMass}/> Těžiště</label><label><input type="checkbox" bind:checked={visuals.contacts}/> Kontaktní body</label>
    <label>Časová délka vektoru<input aria-label="Měřítko vektorů" type="range" min="0.05" max="0.8" step="0.05" bind:value={visuals.vectorScale}/> {visuals.vectorScale.toFixed(2)} s</label>
    <strong>Trajektorie</strong><label><input type="checkbox" bind:checked={visuals.trajectory.enabled}/> Stopa pohybu</label><label>Vzorkování [s]<input type="number" min="0.01" max="2" step="0.01" bind:value={visuals.trajectory.sampleInterval}/></label><label>Maximum bodů<input type="number" min="2" max="5000" step="1" bind:value={visuals.trajectory.maxPoints}/></label><label><input type="checkbox" bind:checked={visuals.trajectory.fade}/> Plynulé zeslabení</label><button onclick={() => renderer?.clearTrails()}>Smazat stopy</button>
    <small>Barva: rychlost azurová, zrychlení korálová, gravitace fialová, kontakty červené.</small>
  </div></details><button disabled={!ready} onclick={() => { renderer.fitToScene(document, snapshot); zoom = Math.round(renderer.view.zoom * 100); }} title="Zobrazit celou scénu">⤢</button><button onclick={() => { if (ready) { renderer.resetView(); zoom = Math.round(renderer.view.zoom * 100); } }} title="Obnovit pohled">⌖</button><span>{zoom} %</span></div></div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (interactive canvas has global keyboard shortcuts) -->
  <div class="canvas-host" class:panning={tool === 'pan'} class:rotating={tool === 'rotate'} class:resizing={tool === 'resize'} style:background-color={document.world.background} style:background-image={backgroundAsset ? `url("${backgroundAsset.dataUrl}")` : 'none'} bind:this={host} role="application" tabindex="0" aria-label="Fyzikální scéna" onpointerdown={pointerDown} onpointermove={pointerMove} onpointerup={e => { if (e.pointerId === pointerId) { pointerMove(e); finish(); } }} onpointercancel={() => finish(true)} onlostpointercapture={() => { if (pointerId !== undefined) finish(true); }} onwheel={e => { e.preventDefault(); if (!ready || pointerId !== undefined) return; const r = host.getBoundingClientRect(); renderer.zoomAt({ x: e.clientX - r.left, y: e.clientY - r.top }, Math.exp(-e.deltaY * 0.001)); zoom = Math.round(renderer.view.zoom * 100); }}>
    <div class="canvas-overlay"><span class="eyebrow">{document.name}</span><p>t = {time.toFixed(3)} s</p><p>g = {Math.abs(document.world.gravity.y)} m/s²</p></div>
    <div class="axis-key">↑ y <span>→ x</span><small>Svět v metrech</small></div>
    <div class="scale-ruler" style:width={`${document.world.pixelsPerMeter * zoom / 100}px`}><span>1 m</span></div>
    <div class="tool-hint">{tool === 'rotate' ? 'Táhněte okraj tělesa kolem středu · Shift: 15°' : tool === 'resize' ? 'Táhněte okraj tělesa od středu · přesné rozměry v Inspectoru' : tool === 'pan' ? 'Tažením posunete pohled' : 'Táhněte těleso pro přesun · Alt: bez přichycení'}</div>
    {#if error}<div class="canvas-error" role="alert">{error}</div>{/if}
  </div>
</section>

