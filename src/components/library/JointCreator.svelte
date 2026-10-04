<script lang="ts">
  import type { JointType, PhysicsDocument } from '../../lib/document/types';
  import { jointTypes } from '../../lib/physics/joints/joints';
  let { document, selection, disabled, create }: { document: PhysicsDocument; selection: string[]; disabled: boolean; create: (type: JointType, a: string, b: string) => void } = $props();
  let type = $state<JointType>('revolute'), aId = $state(''), bId = $state('');
  const a = $derived(document.bodies.find(body => body.id === aId)?.id ?? document.bodies[0]?.id ?? '');
  const b = $derived(document.bodies.find(body => body.id === bId)?.id ?? document.bodies.find(body => body.id !== a)?.id ?? '');
  function useSelection() { const ids = selection.filter(id => document.bodies.some(body => body.id === id)); if (ids.length === 2) { aId = ids[0]; bId = ids[1]; } }
</script>
<div class="joint-creator">
  <h3>Vazby</h3>
  <div class="joint-types">{#each jointTypes as item}<button {disabled} class:active={type === item.type} onclick={() => { type = item.type; useSelection(); }} title={item.description}>{item.icon} {item.name}</button>{/each}</div>
  <label>Těleso A <select {disabled} value={a} onchange={e => aId = e.currentTarget.value}>{#each document.bodies as body}<option value={body.id}>{body.name}</option>{/each}</select></label>
  <label>Těleso B <select {disabled} value={b} onchange={e => bId = e.currentTarget.value}>{#each document.bodies as body}<option value={body.id}>{body.name}</option>{/each}</select></label>
  <button class="create-joint" disabled={disabled || !a || !b || a === b} onclick={() => create(type, a, b)}>+ Přidat vazbu</button>
  <p class="muted">Kotva je ve středu A; vzdálenost spojuje středy. Parametry upravíte ve vlastnostech vazby.</p>
</div>
