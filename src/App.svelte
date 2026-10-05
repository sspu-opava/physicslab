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
  import ExperimentPanel from './components/experiments/ExperimentPanel.svelte';
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
  import { createExperimentDocument, experimentRegistry } from './lib/experiments/ExperimentRegistry';
  import type { ExperimentControlDefinition, ExperimentDefinition } from './lib/experiments/types';
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
  let experimentMode = $state(false);
  let activeExperimentId = $state(experimentRegistry[0].id);
  let experimentDocument = $state.raw(createExperimentDocument(experimentRegistry[0]));
  let experimentValues = $state<Record<string, number>>({});
  let projectInput: HTMLInputElement;
  let projectDirty = $derived(JSON.stringify(document) !== savedSnapshot);
  let activeExperiment = $derived(experimentRegistry.find(item => item.id === activeExperimentId) ?? experimentRegistry[0]);
  let experimentBodyId = $derived(activeExperiment.sceneTemplate.bodies.find(item => item.type === 'dynamic')?.id ?? '');
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
  function initialControlValues(experiment: ExperimentDefinition, scene: typeof experimentDocument): Record<string, number> {
    return Object.fromEntries(experiment.controls.map(control => [control.id, readControl(control, scene)]));
  }
  function readControl(control: ExperimentControlDefinition, scene: typeof experimentDocument): number {
    const target = control.target;
    if (target.kind === 'gravityY') return Math.abs(scene.world.gravity.y);
    if (target.kind === 'springStiffness') return Number(scene.forces.find(force => force.id === target.forceId)?.parameters.stiffness ?? control.min);
    const body = scene.bodies.find(item => item.id === target.bodyId);
    if (!body) return control.min;
    if (target.kind === 'bodyVelocityX') return body.initialVelocity.x;
    if (target.kind === 'bodyVelocityY') return body.initialVelocity.y;
    if (target.kind === 'bodyMass') return body.mass;
    if (target.kind === 'bodyPositionX') return body.position.x;
    return body.position.y;
  }
  function applyExperimentControl(control: ExperimentControlDefinition, value: number, scene: typeof experimentDocument): void {
    const target = control.target;
    if (target.kind === 'gravityY') { scene.world.gravity.y = -value; return; }
    if (target.kind === 'springStiffness') { const force = scene.forces.find(item => item.id === target.forceId); if (force) force.parameters.stiffness = value; return; }
    const body = scene.bodies.find(item => item.id === target.bodyId); if (!body) return;
    if (target.kind === 'bodyVelocityX') body.initialVelocity.x = value;
    else if (target.kind === 'bodyVelocityY') body.initialVelocity.y = value;
    else if (target.kind === 'bodyMass') body.mass = value;
    else if (target.kind === 'bodyPositionX') body.position.x = value;
    else body.position.y = value;
  }
  function resetExperiment(experiment = activeExperiment) {
    activeExperimentId = experiment.id;
    experimentDocument = createExperimentDocument(experiment);
    experimentValues = initialControlValues(experiment, experimentDocument);
    simulation.reset(experimentDocument); sync();
  }
  function setExperimentMode(enabled: boolean) {
    if (enabled === experimentMode) return;
    experimentMode = enabled;
    if (enabled) resetExperiment();
    else { simulation.reset(document); sync(); }
  }
  function chooseExperiment(id: string) {
    const experiment = experimentRegistry.find(item => item.id === id); if (experiment) resetExperiment(experiment);
  }
  function changeExperimentControl(id: string, value: number) {
    if (!experimentMode || !Number.isFinite(value)) return;
    const control = activeExperiment.controls.find(item => item.id === id); if (!control) return;
    const bounded = Math.max(control.min, Math.min(control.max, value));
    const next = structuredClone(experimentDocument); applyExperimentControl(control, bounded, next);
    experimentDocument = next; experimentValues = { ...experimentValues, [id]: bounded };
    simulation.reset(next); sync();
  }
  function action(action: string) {
    if (editing) return;
    if (experimentMode) {
      if (action === 'play') simulation.play();
      else if (action === 'pause') simulation.pause();
      else if (action === 'step') simulation.singleStep();
      else { simulation.reset(experimentDocument); sync(); }
      sync(); return;
    }
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
    if (experimentMode) setExperimentMode(false);
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
    if (experimentMode) setExperimentMode(false);
    const next = createDocument(); editor.replaceDocument(next); document = editor.document; selection = []; canUndo = false; canRedo = false; editing = false;
    simulation.reset(document); sync(); savedSnapshot = JSON.stringify(document); notice = '';
  }
  function keyboard(event: KeyboardEvent) {
    if (event.target instanceof HTMLElement && (event.target.closest('input,select,textarea,[contenteditable=true]'))) return;
    if (event.key === 'Escape') { if (experimentMode) setExperimentMode(false); else gesture('cancel'); return; }
    if (experimentMode) return;
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
  <Toolbar {status} {scale} {action} {editing} experimentMode={experimentMode} onExperiment={() => setExperimentMode(!experimentMode)} setScale={n => scale = n} {tool} setTool={next => tool = next}/>
  {#if !experimentMode}<div class="editor-bar">
    <div><button disabled={status !== 'STOPPED' || editing || !canUndo} onclick={() => editAction('undo')} title="Zpět (Ctrl+Z)">↶ Zpět</button><button disabled={status !== 'STOPPED' || editing || !canRedo} onclick={() => editAction('redo')} title="Znovu (Ctrl+Shift+Z)">↷ Znovu</button><button disabled={status !== 'STOPPED' || editing || !selection.some(id => document.bodies.some(body => body.id === id))} onclick={() => editAction('duplicate')}>⧉ Duplikovat</button><button disabled={status !== 'STOPPED' || editing || !selection.length} onclick={() => editAction('delete')}>× Smazat</button></div>
    <label>Přichytit <select value={snapInterval} onchange={e => snapInterval = Number(e.currentTarget.value)}>{#each [0, 0.01, 0.05, 0.1, 0.5, 1] as step}<option value={step}>{step === 0 ? 'Vypnuto' : `${step} m`}</option>{/each}</select></label><span>{selection.length} vybráno · Shift: více těles · tažení prázdné plochy: výběr</span>
  </div>{:else}<div class="experiment-bar"><span class="experiment-live-dot"></span><strong>Experiment Mode</strong><span>{activeExperiment.name}</span><span class="experiment-bar-note">Scéna uzamčená · parametry upravíte vlevo</span></div>{/if}
  {#if notice}<div class="app-notice" role="alert">{notice}<button onclick={() => notice = ''} aria-label="Zavřít upozornění">×</button></div>{/if}
  {#if experimentMode}
    <main class="experiment-workspace"><ExperimentPanel experiments={experimentRegistry} activeId={activeExperimentId} values={experimentValues} onSelect={chooseExperiment} onControl={changeExperimentControl} onExit={() => setExperimentMode(false)}/><div class="center-column"><SimulationCanvas document={experimentDocument} state={snapshot} contacts={simulation.contactPoints} selection={[experimentBodyId]} select={() => {}} {tool} {time} {snapInterval} assetsDisabled editable={false} editing={false} gesture={() => {}} selectMany={() => {}} addAsset={() => false} removeAsset={() => false} setBackgroundAsset={() => false}/><Measurements state={snapshot[experimentBodyId]} {time} name={experimentDocument.bodies.find(item => item.id === experimentBodyId)?.name ?? 'Těleso'} document={experimentDocument} selectedBodyId={experimentBodyId} {series} {readings} disabled add={() => false} update={() => false} remove={() => {}} clear={() => { simulation.clearMeasurements(); sync(); }}/></div></main>
  {:else}
  <main class="workspace"><Library disabled={status !== 'STOPPED' || editing} {add} {document} {selection} {addJoint} addForce={force=>moduleAction(()=>editor.addForce(force))} {updateForce} removeForce={id=>moduleAction(()=>editor.removeForce(id))} addField={field=>moduleAction(()=>editor.addField(field))} {updateField} removeField={id=>moduleAction(()=>editor.removeField(id))}/><div class="center-column"><SimulationCanvas {document} state={snapshot} contacts={simulation.contactPoints} {selection} {select} {tool} {time} {snapInterval} assetsDisabled={status !== 'STOPPED' || editing} addAsset={asset => moduleAction(() => editor.addAsset(asset))} removeAsset={assetId => moduleAction(() => editor.removeAsset(assetId))} setBackgroundAsset={assetId => moduleAction(() => editor.setBackgroundAsset(assetId))} editable={status === 'STOPPED'} {editing} {gesture} selectMany={ids => { editor.selection = ids; selection = [...ids]; }}/><Measurements state={snapshot[selected]} {time} name={body?.name ?? 'Bez výběru'} {document} selectedBodyId={body?.id ?? ''} {series} {readings} disabled={status !== 'STOPPED' || editing} add={addMeasurement} update={updateMeasurement} remove={id => measurementAction(() => editor.removeMeasurement(id))} clear={() => { simulation.clearMeasurements(); sync(); }}/></div><aside class="right-column"><SceneTree {document} {selection} {select}/>{#if joint}<JointInspector {joint} {document} disabled={status !== 'STOPPED' || editing} update={updateJoint}/>{:else}<Inspector {body} state={snapshot[selected]} disabled={status !== 'STOPPED'} {update} beginEdit={() => { if (status === 'STOPPED') editor.beginGesture(); }} endEdit={() => { if (editor.isEditing && !pointerEditing) { editor.endGesture('Změnit vlastnosti'); syncEditor(); } }}/>{/if}</aside></main>
  {/if}
  <footer class="statusbar"><span><i class:running={status === 'RUNNING'}></i>{status === 'RUNNING' ? 'Simulace běží' : status === 'PAUSED' ? 'Pozastaveno' : 'Režim úprav'}</span><span>{document.bodies.length} tělesa <b>·</b> {document.joints.length} vazby <b>·</b> Δt = 1/120 s</span><span class="status-tip">Kolečko: přiblížení <b>·</b> Posun: tažení plátna</span><span>+x doprava <b>·</b> +y nahoru</span></footer>
</div>

