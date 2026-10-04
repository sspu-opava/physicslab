<script lang="ts">
  import type { PhysicsDocument } from '../../lib/document/types';
  import { jointTypes } from '../../lib/physics/joints/joints';
  let { document, selection, select }: { document: PhysicsDocument; selection: string[]; select: (id: string, additive?: boolean) => void } = $props();
</script>
<section class="panel scene-tree">
  <div class="panel-tabs"><span class="selected-tab">Scéna</span><span class="count">{document.bodies.length} tělesa</span></div>
  <div class="world-row">▾ <span>▤</span> Svět <small>m · kg · s</small></div>
  <div class="gravity-row">↓ <span>Gravitace</span><small>{document.world.gravity.y} m/s²</small></div>
  {#each document.bodies as body}<button class="tree-row" aria-pressed={selection.includes(body.id)} class:selected={selection.includes(body.id)} onclick={e => select(body.id, e.shiftKey)}><span class="visibility">◉</span><span style:color={body.appearance.fill}>{body.fixtures[0].shape.type === 'circle' ? '●' : '▬'}</span>{body.name}<small>{body.type === 'static' ? 'statické' : body.type === 'kinematic' ? 'kinematické' : 'dynamické'}</small></button>{/each}
  {#if document.joints.length}<div class="world-row joints-heading">Vazby <small>{document.joints.length}</small></div>{/if}
  {#each document.joints as joint}<button class="tree-row" aria-pressed={selection.includes(joint.id)} class:selected={selection.includes(joint.id)} onclick={e => select(joint.id, e.shiftKey)}><span class="visibility">{joint.enabled ? '◉' : '○'}</span><span class="joint-symbol">{jointTypes.find(item => item.type === joint.type)?.icon}</span>{joint.name}<small>{joint.enabled ? '' : 'vypnuto'}</small></button>{/each}
</section>
