<script lang="ts">
  import type { PhysicsDocument } from '../../lib/document/types';
  let { document, selection, select }: { document: PhysicsDocument; selection: string[]; select: (id: string, additive?: boolean) => void } = $props();
</script>
<section class="panel scene-tree">
  <div class="panel-tabs"><span class="selected-tab">Scéna</span><span class="count">{document.bodies.length} tělesa</span></div>
  <div class="world-row">▾ <span>▤</span> Svět <small>m · kg · s</small></div>
  <div class="gravity-row">↓ <span>Gravitace</span><small>{document.world.gravity.y} m/s²</small></div>
  {#each document.bodies as body}<button class="tree-row" aria-pressed={selection.includes(body.id)} class:selected={selection.includes(body.id)} onclick={e => select(body.id, e.shiftKey)}><span class="visibility">◉</span><span style:color={body.appearance.fill}>{body.fixtures[0].shape.type === 'circle' ? '●' : '▬'}</span>{body.name}<small>{body.type === 'static' ? 'statické' : body.type === 'kinematic' ? 'kinematické' : 'dynamické'}</small></button>{/each}
</section>
