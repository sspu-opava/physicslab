<script lang="ts">
  import { onMount } from 'svelte';
  import Toolbar from './components/toolbar/Toolbar.svelte';
  import Library from './components/library/Library.svelte';
  import SceneTree from './components/scene/SceneTree.svelte';
  import Inspector from './components/inspector/Inspector.svelte';
  import JointInspector from './components/inspector/JointInspector.svelte';
  import SimulationCanvas from './components/canvas/SimulationCanvas.svelte';
  import Measurements from './components/graphs/Measurements.svelte';
  import { createBody, createDocument } from './lib/document/createDocument';
  import type { BodyDefinition, JointDefinition, JointType, SceneState } from './lib/document/types';
  import { createJoint } from './lib/physics/joints/joints';
  import { PlanckPhysicsAdapter } from './lib/physics/adapters/PlanckPhysicsAdapter';
  import { SimulationCore, type SimulationStatus } from './lib/simulation/SimulationCore';
  import { SceneEditor } from './lib/scene/SceneEditor';
  import type { SceneTool } from './lib/tools/SceneTools';
  const initialDocument = createDocument();
  const editor = new SceneEditor(initialDocument);
  editor.select('ball');
  let document = $state.raw(initialDocument);
  const simulation = new SimulationCore(new PlanckPhysicsAdapter(), initialDocument);
  let snapshot = $state.raw<SceneState>(simulation.current), status = $state<SimulationStatus>('STOPPED'), time = $state(0);
  let selection = $state.raw<string[]>(['ball']), tool = $state<SceneTool>('select'), scale = $state(1);
  let canUndo = $state(false), canRedo = $state(false), editing = $state(false), snapInterval = $state(0.1);
  let pointerEditing = false;
  let selected = $derived(selection.at(-1) ?? '');
  let body = $derived(document.bodies.find(b => b.id === selected));
  let joint = $derived(document.joints.find(j => j.id === selected));
  let notice = $state('');
  function addJoint(type: JointType, aId: string, bId: string) {
    if (status !== 'STOPPED' || editing) return;
    try {
      const a = document.bodies.find(body => body.id === aId), b = document.bodies.find(body => body.id === bId);
      if (!a || !b) return;
      editor.addJoint(createJoint(type, a, b, crypto.randomUUID())); notice = ''; syncEditor();
    } catch (error) { notice = String(error instanceof Error ? error.message : error); }
  }
  function updateJoint(next: JointDefinition): boolean {
    if (status !== 'STOPPED' || editing) return false;
    try { editor.updateJoint(next); notice = ''; syncEditor(); return true; }
    catch (error) { notice = String(error instanceof Error ? error.message : error); return false; }
  }
  function sync() { snapshot = simulation.current; time = simulation.clock.time; status = simulation.status; }
  function action(action: string) {
    if (editing) return;
    if (editor.isEditing) { editor.endGesture('Změnit vlastnosti'); syncEditor(); }
    if (action === 'play') simulation.play();
    else if (action === 'pause') simulation.pause();
    else if (action === 'step') simulation.singleStep();
    else simulation.reset(document);
    sync();
  }
  function syncEditor() {
    document = editor.document; selection = [...editor.selection];
    canUndo = editor.history.canUndo || editor.hasPendingChanges; canRedo = editor.history.canRedo && !editor.hasPendingChanges; editing = pointerEditing && editor.isEditing;
    simulation.reset(document); sync();
  }
  function select(id: string, additive = false) { editor.select(id, additive); selection = [...editor.selection]; }
  function editAction(action: string) {
    if (status !== 'STOPPED' || editing) return;
    if (editor.isEditing) editor.endGesture('Změnit vlastnosti');
    if (action === 'undo') editor.undo();
    else if (action === 'redo') editor.redo();
    else if (action === 'duplicate') editor.duplicateSelected();
    else if (action === 'delete') editor.deleteSelected();
    syncEditor();
  }
  function gesture(action: 'begin' | 'end' | 'cancel', bodies?: BodyDefinition[]) {
    if (status !== 'STOPPED') return;
    if (action === 'begin') { pointerEditing = true; editor.beginGesture(); }
    if (bodies) editor.preview(bodies);
    if (action !== 'begin') { editor.endGesture('Transformovat tělesa', action === 'cancel'); pointerEditing = false; }
    syncEditor();
  }
  function update(next: BodyDefinition) {
    if (status !== 'STOPPED') return;
    try { editor.updateBody(next); notice = ''; syncEditor(); }
    catch (error) { notice = String(error instanceof Error ? error.message : error); }
  }
  function add(shape: 'circle' | 'box') {
    if (status !== 'STOPPED') return;
    const next = createBody(crypto.randomUUID(), shape, { x: (document.bodies.length - 1) * 0.8, y: 4 });
    editor.addBody(next); syncEditor();
  }
  function keyboard(event: KeyboardEvent) {
    if (event.target instanceof HTMLElement && (event.target.closest('input,select,textarea,[contenteditable=true]'))) return;
    if (event.key === 'Escape') { gesture('cancel'); return; }
    if (status !== 'STOPPED' || editing || event.altKey) return;
    const key = event.key.toLowerCase(), command = event.ctrlKey || event.metaKey;
    if (command && key === 'z') { event.preventDefault(); editAction(event.shiftKey ? 'redo' : 'undo'); }
    else if (command && key === 'y') { event.preventDefault(); editAction('redo'); }
    else if (command && key === 'd') { event.preventDefault(); editAction('duplicate'); }
    else if (command && key === 'a') { event.preventDefault(); editor.selection = document.bodies.map(body => body.id); selection = [...editor.selection]; }
    else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); editAction('delete'); }
    else if (!command) { const tools: Record<string, SceneTool> = { v: 'select', h: 'pan', r: 'rotate', s: 'resize' }; if (tools[key]) tool = tools[key]; }
  }
  onMount(() => {
    let last = performance.now(), frame: number;
    const tick = (now: number) => { simulation.advance((now - last) / 1000, scale); last = now; if (simulation.status === 'RUNNING') sync(); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  });
</script>
<svelte:window onkeydown={keyboard}/>
<div class="app-shell">
  <header class="titlebar"><div class="brand"><span class="brand-mark">P</span>PhysicsLab</div><span class="app-caption">Vizuální fyzikální laboratoř</span><span class="document-title">{document.name} <small>· nový projekt</small></span><span class="version">0.1.0</span></header>
  <Toolbar {status} {scale} {action} {editing} setScale={n => scale = n} {tool} setTool={next => tool = next}/>
  <div class="editor-bar">
    <div><button disabled={status !== 'STOPPED' || editing || !canUndo} onclick={() => editAction('undo')} title="Zpět (Ctrl+Z)">↶ Zpět</button><button disabled={status !== 'STOPPED' || editing || !canRedo} onclick={() => editAction('redo')} title="Znovu (Ctrl+Shift+Z)">↷ Znovu</button><button disabled={status !== 'STOPPED' || editing || !selection.some(id => document.bodies.some(body => body.id === id))} onclick={() => editAction('duplicate')}>⧉ Duplikovat</button><button disabled={status !== 'STOPPED' || editing || !selection.length} onclick={() => editAction('delete')}>× Smazat</button></div>
    <label>Přichytit <select value={snapInterval} onchange={e => snapInterval = Number(e.currentTarget.value)}>{#each [0, 0.01, 0.05, 0.1, 0.5, 1] as step}<option value={step}>{step === 0 ? 'Vypnuto' : `${step} m`}</option>{/each}</select></label><span>{selection.length} vybráno · Shift: více těles · tažení prázdné plochy: výběr</span>
  </div>
  {#if notice}<div class="app-notice" role="alert">{notice}<button onclick={() => notice = ''} aria-label="Zavřít upozornění">×</button></div>{/if}
  <main class="workspace"><Library disabled={status !== 'STOPPED' || editing} {add} {document} {selection} {addJoint}/><div class="center-column"><SimulationCanvas {document} state={snapshot} {selection} {select} {tool} {time} {snapInterval} editable={status === 'STOPPED'} {editing} {gesture} selectMany={ids => { editor.selection = ids; selection = [...ids]; }}/><Measurements state={snapshot[selected]} {time} name={body?.name ?? 'Bez výběru'}/></div><aside class="right-column"><SceneTree {document} {selection} {select}/>{#if joint}<JointInspector {joint} {document} disabled={status !== 'STOPPED' || editing} update={updateJoint}/>{:else}<Inspector {body} state={snapshot[selected]} disabled={status !== 'STOPPED'} {update} beginEdit={() => { if (status === 'STOPPED') editor.beginGesture(); }} endEdit={() => { if (editor.isEditing && !pointerEditing) { editor.endGesture('Změnit vlastnosti'); syncEditor(); } }}/>{/if}</aside></main>
  <footer class="statusbar"><span><i class:running={status === 'RUNNING'}></i>{status === 'RUNNING' ? 'Simulace běží' : status === 'PAUSED' ? 'Pozastaveno' : 'Režim úprav'}</span><span>{document.bodies.length} tělesa <b>·</b> {document.joints.length} vazby <b>·</b> Δt = 1/120 s</span><span class="status-tip">Kolečko: přiblížení <b>·</b> Posun: tažení plátna</span><span>+x doprava <b>·</b> +y nahoru</span></footer>
</div>

