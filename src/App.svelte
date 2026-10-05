<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke, isTauri } from '@tauri-apps/api/core';
  import Toolbar from './components/toolbar/Toolbar.svelte';
  import Library from './components/library/Library.svelte';
  import SceneTree from './components/scene/SceneTree.svelte';
  import Inspector from './components/inspector/Inspector.svelte';
  import JointInspector from './components/inspector/JointInspector.svelte';
  import SimulationCanvas from './components/canvas/SimulationCanvas.svelte';
  import Measurements from './components/graphs/Measurements.svelte';
  import { createBody, createDocument } from './lib/document/createDocument';
  import type { BodyDefinition, JointDefinition, JointType, SceneState, SensorDefinition, SensorType, MeasurementDefinition, ForceDefinition, FieldDefinition } from './lib/document/types';
  import { sensorPlugin } from './lib/measurements/SensorRegistry';
  import type { RecordedMeasurement } from './lib/measurements/MeasurementRecorder';
  import { createJoint } from './lib/physics/joints/joints';
  import { PlanckPhysicsAdapter } from './lib/physics/adapters/PlanckPhysicsAdapter';
  import { SimulationCore, type SimulationStatus } from './lib/simulation/SimulationCore';
  import { SceneEditor } from './lib/scene/SceneEditor';
  import type { SceneTool } from './lib/tools/SceneTools';
  import { deserializeProject, serializeProject } from './lib/document/ProjectSerializer';
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
  let savedSnapshot = $state(JSON.stringify(initialDocument));
  let projectInput: HTMLInputElement;
  let projectDirty = $derived(JSON.stringify(document) !== savedSnapshot);
  let series = $state.raw<RecordedMeasurement[]>(simulation.recorder.series), readings = $state.raw(simulation.readings);
  function measurementAction(work: () => void): boolean {
    if (status !== 'STOPPED' || editing) return false;
    try { if (editor.isEditing) editor.endGesture('Změnit vlastnosti'); work(); notice = ''; syncEditor(); return true; }
    catch (error) { notice = String(error instanceof Error ? error.message : error); return false; }
  }
  function addMeasurement(bodyId: string, type: SensorType, sampleInterval: number): boolean {
    const body = document.bodies.find(b => b.id === bodyId); if (!body) return false;
    const sensor: SensorDefinition = { id: crypto.randomUUID(), name: `${body.name} · ${sensorPlugin(type).label}`, type, enabled: true, bodyId };
    return measurementAction(() => editor.addMeasurement(sensor, { id: crypto.randomUUID(), sensorId: sensor.id, sampleInterval, maxSamples: 5000 }));
  }
  function updateMeasurement(sensor: SensorDefinition, measurement: MeasurementDefinition): boolean { return measurementAction(() => editor.updateMeasurement(sensor, measurement)); }
  function updateForce(force: ForceDefinition):boolean { return moduleAction(() => editor.updateForce(force)); }
  function updateField(field: FieldDefinition):boolean { return moduleAction(() => editor.updateField(field)); }
  function moduleAction(work:()=>void):boolean { if(status!=='STOPPED'||editing)return false;try{work();notice='';syncEditor();return true}catch(error){notice=String(error instanceof Error?error.message:error);return false} }
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
  function sync() { snapshot = simulation.current; time = simulation.clock.time; status = simulation.status; readings = simulation.readings; series = simulation.recorder.series.map(s => ({ ...s })); }
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
  function confirmDiscard(): boolean { return !projectDirty || window.confirm('Projekt obsahuje neuložené změny. Opravdu chcete pokračovat bez uložení?'); }
  async function openProject() {
    if (!confirmDiscard()) return;
    try {
      if (isTauri()) {
        const contents = await invoke<string | null>('open_project_file');
        if (contents === null) return;
        loadProject(contents);
      } else projectInput.click();
    } catch (error) { notice = String(error instanceof Error ? error.message : error); }
  }
  function importProjectFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement, file = input.files?.[0];
    if (!file) return;
    void file.text().then(loadProject).catch(error => { notice = String(error instanceof Error ? error.message : error); }).finally(() => { input.value = ''; });
  }
  function loadProject(contents: string) {
    const next = deserializeProject(contents);
    editor.replaceDocument(next); document = editor.document; selection = []; canUndo = false; canRedo = false; editing = false;
    simulation.reset(document); sync(); savedSnapshot = JSON.stringify(document); notice = '';
  }
  async function saveProject() {
    try {
      const contents = serializeProject(document);
      if (isTauri()) {
        const saved = await invoke<boolean>('save_project_file', { contents, defaultName: document.name });
        if (!saved) return;
      } else {
        const blob = new Blob([contents], { type: 'application/json' }), url = URL.createObjectURL(blob), anchor = window.document.createElement('a');
        anchor.href = url; anchor.download = `${document.name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'projekt'}.json`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      savedSnapshot = JSON.stringify(document); notice = '';
    } catch (error) { notice = String(error instanceof Error ? error.message : error); }
  }
  function newProject() {
    if (!confirmDiscard()) return;
    const next = createDocument(); editor.replaceDocument(next); document = editor.document; selection = []; canUndo = false; canRedo = false; editing = false;
    simulation.reset(document); sync(); savedSnapshot = JSON.stringify(document); notice = '';
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
  <header class="titlebar"><div class="brand"><span class="brand-mark">P</span>PhysicsLab</div><span class="app-caption">Vizuální fyzikální laboratoř</span><span class="document-title">{document.name} {#if projectDirty}<small>· neuloženo</small>{:else}<small>· uloženo</small>{/if}</span><nav class="project-actions" aria-label="Projekt"><button onclick={newProject}>Nový</button><button onclick={openProject}>Otevřít</button><button class:unsaved={projectDirty} onclick={saveProject}>Uložit</button></nav><input bind:this={projectInput} class="project-input" type="file" accept=".json,application/json" onchange={importProjectFile} aria-label="Vyberte soubor projektu"/><span class="version">0.1.0</span></header>
  <Toolbar {status} {scale} {action} {editing} setScale={n => scale = n} {tool} setTool={next => tool = next}/>
  <div class="editor-bar">
    <div><button disabled={status !== 'STOPPED' || editing || !canUndo} onclick={() => editAction('undo')} title="Zpět (Ctrl+Z)">↶ Zpět</button><button disabled={status !== 'STOPPED' || editing || !canRedo} onclick={() => editAction('redo')} title="Znovu (Ctrl+Shift+Z)">↷ Znovu</button><button disabled={status !== 'STOPPED' || editing || !selection.some(id => document.bodies.some(body => body.id === id))} onclick={() => editAction('duplicate')}>⧉ Duplikovat</button><button disabled={status !== 'STOPPED' || editing || !selection.length} onclick={() => editAction('delete')}>× Smazat</button></div>
    <label>Přichytit <select value={snapInterval} onchange={e => snapInterval = Number(e.currentTarget.value)}>{#each [0, 0.01, 0.05, 0.1, 0.5, 1] as step}<option value={step}>{step === 0 ? 'Vypnuto' : `${step} m`}</option>{/each}</select></label><span>{selection.length} vybráno · Shift: více těles · tažení prázdné plochy: výběr</span>
  </div>
  {#if notice}<div class="app-notice" role="alert">{notice}<button onclick={() => notice = ''} aria-label="Zavřít upozornění">×</button></div>{/if}
  <main class="workspace"><Library disabled={status !== 'STOPPED' || editing} {add} {document} {selection} {addJoint} addForce={force=>moduleAction(()=>editor.addForce(force))} {updateForce} removeForce={id=>moduleAction(()=>editor.removeForce(id))} addField={field=>moduleAction(()=>editor.addField(field))} {updateField} removeField={id=>moduleAction(()=>editor.removeField(id))}/><div class="center-column"><SimulationCanvas {document} state={snapshot} contacts={simulation.contactPoints} {selection} {select} {tool} {time} {snapInterval} assetsDisabled={status !== 'STOPPED' || editing} addAsset={asset => moduleAction(() => editor.addAsset(asset))} removeAsset={assetId => moduleAction(() => editor.removeAsset(assetId))} setBackgroundAsset={assetId => moduleAction(() => editor.setBackgroundAsset(assetId))} editable={status === 'STOPPED'} {editing} {gesture} selectMany={ids => { editor.selection = ids; selection = [...ids]; }}/><Measurements state={snapshot[selected]} {time} name={body?.name ?? 'Bez výběru'} {document} selectedBodyId={body?.id ?? ''} {series} {readings} disabled={status !== 'STOPPED' || editing} add={addMeasurement} update={updateMeasurement} remove={id => measurementAction(() => editor.removeMeasurement(id))} clear={() => { simulation.clearMeasurements(); sync(); }}/></div><aside class="right-column"><SceneTree {document} {selection} {select}/>{#if joint}<JointInspector {joint} {document} disabled={status !== 'STOPPED' || editing} update={updateJoint}/>{:else}<Inspector {body} state={snapshot[selected]} disabled={status !== 'STOPPED'} {update} beginEdit={() => { if (status === 'STOPPED') editor.beginGesture(); }} endEdit={() => { if (editor.isEditing && !pointerEditing) { editor.endGesture('Změnit vlastnosti'); syncEditor(); } }}/>{/if}</aside></main>
  <footer class="statusbar"><span><i class:running={status === 'RUNNING'}></i>{status === 'RUNNING' ? 'Simulace běží' : status === 'PAUSED' ? 'Pozastaveno' : 'Režim úprav'}</span><span>{document.bodies.length} tělesa <b>·</b> {document.joints.length} vazby <b>·</b> Δt = 1/120 s</span><span class="status-tip">Kolečko: přiblížení <b>·</b> Posun: tažení plátna</span><span>+x doprava <b>·</b> +y nahoru</span></footer>
</div>

