<script lang="ts">
  import { onMount } from 'svelte';
  import Toolbar from './components/toolbar/Toolbar.svelte';
  import Library from './components/library/Library.svelte';
  import SceneTree from './components/scene/SceneTree.svelte';
  import Inspector from './components/inspector/Inspector.svelte';
  import SimulationCanvas from './components/canvas/SimulationCanvas.svelte';
  import Measurements from './components/graphs/Measurements.svelte';
  import { createBody, createDocument } from './lib/document/createDocument';
  import type { BodyDefinition, SceneState } from './lib/document/types';
  import { PlanckPhysicsAdapter } from './lib/physics/adapters/PlanckPhysicsAdapter';
  import { SimulationCore, type SimulationStatus } from './lib/simulation/SimulationCore';
  const initialDocument = createDocument();
  let document = $state.raw(initialDocument);
  const simulation = new SimulationCore(new PlanckPhysicsAdapter(), initialDocument);
  let snapshot = $state.raw<SceneState>(simulation.current), status = $state<SimulationStatus>('STOPPED'), time = $state(0);
  let selected = $state('ball'), pan = $state(false), scale = $state(1);
  let body = $derived(document.bodies.find(b => b.id === selected));
  function sync() { snapshot = simulation.current; time = simulation.clock.time; status = simulation.status; }
  function action(action: string) {
    if (action === 'play') simulation.play();
    else if (action === 'pause') simulation.pause();
    else if (action === 'step') simulation.singleStep();
    else simulation.reset(document);
    sync();
  }
  function update(next: BodyDefinition) {
    if (status !== 'STOPPED') return;
    document = { ...document, bodies: document.bodies.map(b => b.id === next.id ? next : b), modifiedAt: new Date().toISOString() };
    simulation.reset(document); sync();
  }
  function add(shape: 'circle' | 'box') {
    if (status !== 'STOPPED') return;
    const next = createBody(crypto.randomUUID(), shape, { x: (document.bodies.length - 1) * 0.8, y: 4 });
    document = { ...document, bodies: [...document.bodies, next], modifiedAt: new Date().toISOString() }; selected = next.id; simulation.reset(document); sync();
  }
  onMount(() => {
    let last = performance.now(), frame: number;
    const tick = (now: number) => { simulation.advance((now - last) / 1000, scale); last = now; if (simulation.status === 'RUNNING') sync(); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  });
</script>
<div class="app-shell">
  <header class="titlebar"><div class="brand"><span class="brand-mark">P</span>PhysicsLab</div><span class="app-caption">Vizuální fyzikální laboratoř</span><span class="document-title">{document.name} <small>· nový projekt</small></span><span class="version">0.1.0</span></header>
  <Toolbar {status} {scale} {action} setScale={n => scale = n} {pan} setPan={n => pan = n}/>
  <main class="workspace"><Library disabled={status !== 'STOPPED'} {add}/><div class="center-column"><SimulationCanvas {document} state={snapshot} {selected} select={id => selected = id} {pan} {time}/><Measurements state={snapshot[selected]} {time} name={body?.name ?? 'Bez výběru'}/></div><aside class="right-column"><SceneTree {document} {selected} select={id => selected = id}/><Inspector {body} state={snapshot[selected]} disabled={status !== 'STOPPED'} {update}/></aside></main>
  <footer class="statusbar"><span><i class:running={status === 'RUNNING'}></i>{status === 'RUNNING' ? 'Simulace běží' : status === 'PAUSED' ? 'Pozastaveno' : 'Režim úprav'}</span><span>{document.bodies.length} tělesa <b>·</b> Δt = 1/120 s</span><span class="status-tip">Kolečko: přiblížení <b>·</b> Posun: tažení plátna</span><span>+x doprava <b>·</b> +y nahoru</span></footer>
</div>

