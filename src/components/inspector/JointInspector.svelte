<script lang="ts">
  import type { JointDefinition, PhysicsDocument } from '../../lib/document/types';
  import { jointTypes, localToWorld, worldToLocal } from '../../lib/physics/joints/joints';
  let { joint, document, disabled, update }: { joint: JointDefinition; document: PhysicsDocument; disabled: boolean; update: (joint: JointDefinition) => boolean } = $props();
  let revision = $state(0);
  function apply(next: JointDefinition): boolean {
    const accepted = update(next); if (!accepted) revision++;
    return accepted;
  }
  function number(field: string, value: string) {
    const n = Number(value); if (!Number.isFinite(n) || !value.trim()) return;
    const next = structuredClone(joint);
    if (field.includes('.')) {
      const [key, axis] = field.split('.');
      if (key === 'localAnchorA' || key === 'localAnchorB') next[key][axis as 'x' | 'y'] = n;
      else if (key === 'localAxisA' && next.type === 'prismatic') next.localAxisA[axis as 'x' | 'y'] = n;
    } else if (field === 'length' && next.type === 'distance') next.length = n;
    else if (field === 'referenceAngle' && next.type !== 'distance') next.referenceAngle = n * Math.PI / 180;
    else if ((field === 'lowerAngle' || field === 'upperAngle') && next.type === 'revolute') next[field] = n * Math.PI / 180;
    else if ((field === 'lowerTranslation' || field === 'upperTranslation') && next.type === 'prismatic') next[field] = n;
    apply(next);
  }
  function toggle(field: 'enabled' | 'collideConnected' | 'enableLimit', value: boolean) {
    const next = structuredClone(joint);
    if (field !== 'enableLimit') next[field] = value;
    else if (next.type === 'prismatic' || next.type === 'revolute') next.enableLimit = value;
    apply(next);
  }
  function alignAnchors() {
    const a = document.bodies.find(body => body.id === joint.bodyAId), b = document.bodies.find(body => body.id === joint.bodyBId);
    if (!a || !b) return;
    const next = structuredClone(joint); next.localAnchorB = worldToLocal(localToWorld(joint.localAnchorA, a), b); apply(next);
  }
</script>
<section class="panel inspector joint-inspector">
  <div class="section-title">Vlastnosti vazby <span>⛓</span></div>
  {#key revision}<div class="inspector-content">
    <label>Název vazby <input {disabled} value={joint.name} onchange={e => apply({ ...joint, name: e.currentTarget.value })}/></label>
    <p class="joint-kind">{jointTypes.find(item => item.type === joint.type)?.name}</p>
    <label>Aktivní <input type="checkbox" {disabled} checked={joint.enabled} onchange={e => toggle('enabled', e.currentTarget.checked)}/></label>
    <label>Kolize propojených <input type="checkbox" {disabled} checked={joint.collideConnected} onchange={e => toggle('collideConnected', e.currentTarget.checked)}/></label>
    <h4>▾ Propojená tělesa</h4>
    {#each ['bodyAId', 'bodyBId'] as key}<label>{key === 'bodyAId' ? 'Těleso A' : 'Těleso B'} <select {disabled} value={joint[key as 'bodyAId' | 'bodyBId']} onchange={e => apply({ ...joint, [key]: e.currentTarget.value })}>{#each document.bodies as body}<option value={body.id}>{body.name}</option>{/each}</select></label>{/each}
    <h4>▾ Místní kotvy</h4>
    <p class="muted joint-help">V metrech od středu tělesa, v jeho otočených osách.</p>
    {#each ['localAnchorA', 'localAnchorB'] as key}
      {#each ['x', 'y'] as axis}<label>Kotva {key === 'localAnchorA' ? 'A' : 'B'} {axis} <input type="number" step="0.1" {disabled} value={joint[key as 'localAnchorA' | 'localAnchorB'][axis as 'x' | 'y']} onchange={e => number(`${key}.${axis}`, e.currentTarget.value)}/><small>m</small></label>{/each}
    {/each}
    {#if joint.type === 'distance'}
      <h4>▾ Délka</h4><label>Délka vazby <input type="number" min="0.05" step="0.1" {disabled} value={joint.length} onchange={e => number('length', e.currentTarget.value)}/><small>m</small></label>
    {:else}
      <button class="align-anchors" {disabled} onclick={alignAnchors}>Spojit kotvy v bodě A</button>
      <label>Referenční úhel <input type="number" step="1" {disabled} value={(joint.referenceAngle * 180 / Math.PI).toFixed(1)} onchange={e => number('referenceAngle', e.currentTarget.value)}/><small>°</small></label>
    {/if}
    {#if joint.type === 'prismatic'}
      <h4>▾ Osa posuvu v tělese A</h4>{#each ['x', 'y'] as axis}<label>Osa {axis} <input type="number" step="0.1" {disabled} value={joint.localAxisA[axis as 'x' | 'y']} onchange={e => number(`localAxisA.${axis}`, e.currentTarget.value)}/></label>{/each}
    {/if}
    {#if joint.type === 'prismatic' || joint.type === 'revolute'}
      <h4>▾ Meze pohybu</h4><label>Omezit pohyb <input type="checkbox" {disabled} checked={joint.enableLimit} onchange={e => toggle('enableLimit', e.currentTarget.checked)}/></label>
      {#if joint.type === 'revolute'}{#each ['lowerAngle', 'upperAngle'] as key}<label>{key === 'lowerAngle' ? 'Dolní úhel' : 'Horní úhel'} <input type="number" step="5" {disabled} value={(joint[key as 'lowerAngle' | 'upperAngle'] * 180 / Math.PI).toFixed(1)} onchange={e => number(key, e.currentTarget.value)}/><small>°</small></label>{/each}
      {:else}{#each ['lowerTranslation', 'upperTranslation'] as key}<label>{key === 'lowerTranslation' ? 'Dolní mez' : 'Horní mez'} <input type="number" step="0.1" {disabled} value={joint[key as 'lowerTranslation' | 'upperTranslation']} onchange={e => number(key, e.currentTarget.value)}/><small>m</small></label>{/each}{/if}
    {/if}
    <p class="muted joint-help">{disabled ? 'Pro úpravy stiskněte Reset.' : 'Vazbu odstraníte tlačítkem Smazat. Změny podporují Undo/Redo.'}</p>
  </div>{/key}
</section>
