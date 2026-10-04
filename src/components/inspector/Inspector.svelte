<script lang="ts">
  import type { BodyDefinition, BodyState } from '../../lib/document/types';
  let { body, state, disabled, update }: { body?: BodyDefinition; state?: BodyState; disabled: boolean; update: (body: BodyDefinition) => void } = $props();
  function change(field: string, value: string) {
    if (!body) return;
    const next = structuredClone(body), n = Number(value);
    if (field === 'name') next.name = value;
    else if (field === 'fill') next.appearance.fill = value;
    else if (!Number.isFinite(n)) return;
    else if (field === 'x' || field === 'y') next.position[field] = n;
    else if (field === 'vx' || field === 'vy') next.initialVelocity[field === 'vx' ? 'x' : 'y'] = n;
    else if (field === 'angle') next.angle = n * Math.PI / 180;
    else if (field === 'mass') next.mass = Math.max(0.001, n);
    else if (field === 'friction' || field === 'restitution') next.fixtures.forEach(f => f[field] = Math.max(0, Math.min(1, n)));
    else if (field === 'linearDamping') next.linearDamping = Math.max(0, n);
    update(next);
  }
</script>
<section class="panel inspector">
  <div class="section-title">Vlastnosti <span>{disabled ? '▣' : '◇'}</span></div>
  {#if body}
    <div class="inspector-content">
      <label>Název <input {disabled} value={body.name} oninput={e => change('name', e.currentTarget.value)}/></label>
      <label>Typ <input disabled value={body.type === 'static' ? 'Statické těleso' : 'Dynamické těleso'}/></label>
      <h4>▾ Transformace</h4>
      <div class="paired">{#each ['x', 'y'] as axis}<label>{axis} <input type="number" step="0.1" {disabled} value={body.position[axis as 'x' | 'y']} oninput={e => change(axis, e.currentTarget.value)}/><small>m</small></label>{/each}</div>
      <label>Rotace <input type="number" step="1" {disabled} value={(body.angle * 180 / Math.PI).toFixed(1)} oninput={e => change('angle', e.currentTarget.value)}/><small>°</small></label>
      <h4>▾ Fyzikální vlastnosti</h4>
      <label>Hmotnost <input type="number" min="0.001" step="0.1" disabled={disabled || body.type === 'static'} value={body.mass} oninput={e => change('mass', e.currentTarget.value)}/><small>kg</small></label>
      <label>Tření <input type="number" min="0" max="1" step="0.05" {disabled} value={body.fixtures[0].friction} oninput={e => change('friction', e.currentTarget.value)}/></label>
      <label>Restituce <input type="number" min="0" max="1" step="0.05" {disabled} value={body.fixtures[0].restitution} oninput={e => change('restitution', e.currentTarget.value)}/></label>
      <label>Tlumení <input type="number" min="0" step="0.01" {disabled} value={body.linearDamping} oninput={e => change('linearDamping', e.currentTarget.value)}/><small>s⁻¹</small></label>
      <h4>▾ Počáteční rychlost</h4>
      {#each ['vx', 'vy'] as axis}<label>{axis}<input type="number" step="0.1" {disabled} value={body.initialVelocity[axis === 'vx' ? 'x' : 'y']} oninput={e => change(axis, e.currentTarget.value)}/><small>m/s</small></label>{/each}
      <h4>▾ Vzhled</h4><label>Výplň <input type="color" {disabled} value={body.appearance.fill} oninput={e => change('fill', e.currentTarget.value)}/></label>
      {#if state}<div class="live-state"><span class="eyebrow">AKTUÁLNÍ STAV</span><p>y = {state.position.y.toFixed(3)} m <span>v = {Math.hypot(state.velocity.x, state.velocity.y).toFixed(3)} m/s</span></p></div>{/if}
      {#if disabled}<p class="muted inspector-hint">Pro úpravy scény stiskněte Reset.</p>{/if}
    </div>
  {:else}<p class="empty-state">Vyberte těleso ve scéně.</p>{/if}
</section>
