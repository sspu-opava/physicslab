<script lang="ts">
  let { disabled, add }: { disabled: boolean; add: (shape: 'circle' | 'box') => void } = $props();
  let search = $state('');
  const items = [{ type: 'circle' as const, label: 'Kruh', icon: '●' }, { type: 'box' as const, label: 'Obdélník', icon: '▬' }];
</script>
<aside class="panel library">
  <div class="panel-tabs"><span class="selected-tab">Knihovna</span><span class="muted">Základní moduly</span></div>
  <div class="library-content">
    <input class="search" placeholder="Hledat těleso…" aria-label="Hledat těleso" bind:value={search}/>
    <h3>Tělesa</h3><div class="library-grid">
      {#each items.filter(item => item.label.toLocaleLowerCase('cs').includes(search.toLocaleLowerCase('cs'))) as item}
        <button class="library-item" {disabled} onclick={() => add(item.type)}><span class="shape-icon">{item.icon}</span>{item.label}</button>
      {/each}
    </div>
    <div class="library-note"><span class="note-icon">↓</span><h3>Gravitační pole</h3><p>Svět používá gravitační zrychlení Země.</p><strong>9,81 <small>m/s²</small></strong></div>
    <div class="foundation-note"><span class="eyebrow">PRVNÍ EXPERIMENT</span><h3>Volný pád</h3><p>Spusťte simulaci a sledujte pád a odrazy koule. Vlastnosti můžete upravit po resetu.</p><span class="tag">SI jednotky</span><span class="tag">120 kroků / s</span></div>
  </div>
  <div class="library-footer">PhysicsLab <span>Foundation · 0.1</span></div>
</aside>
