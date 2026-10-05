<script lang="ts">
  import type { PhysicsDocument, ProjectAsset } from '../../lib/document/types';
  import { AssetManager as AssetLibrary } from '../../lib/document/AssetManager';

  let { document, disabled, add, remove, setBackground }: {
    document: PhysicsDocument; disabled: boolean; add: (asset: ProjectAsset) => void;
    remove: (assetId: string) => void; setBackground: (assetId: string | null) => void;
  } = $props();
  let picker: HTMLInputElement;
  let error = $state('');

  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement, file = input.files?.[0];
    if (!file) return;
    try { add(await AssetLibrary.importFile(file)); error = ''; }
    catch (reason) { error = reason instanceof Error ? reason.message : String(reason); }
    finally { input.value = ''; }
  }
</script>

<details class="asset-menu">
  <summary>Obrázky <small>{document.assets.length}</small></summary>
  <div class="asset-popover">
    <strong>Assety projektu</strong>
    <p>Obrázky se vloží do souboru projektu, takže zůstanou přenositelné.</p>
    <button disabled={disabled} onclick={() => picker.click()}>＋ Přidat obrázek</button>
    <input bind:this={picker} class="asset-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onchange={importFile} aria-label="Vybrat obrázek projektu"/>
    {#if document.assets.length === 0}<small>Projekt zatím nemá obrázky.</small>{/if}
    {#each document.assets as asset (asset.assetId)}
      <div class="asset-row">
        <img src={asset.dataUrl} alt=""/>
        <span title={asset.name}>{asset.name}<small>{(asset.sizeBytes / 1024).toFixed(0)} kB</small></span>
        <button disabled={disabled} class:asset-active={document.world.backgroundAssetId === asset.assetId} onclick={() => setBackground(document.world.backgroundAssetId === asset.assetId ? null : asset.assetId)}>{document.world.backgroundAssetId === asset.assetId ? 'Pozadí ✓' : 'Pozadí'}</button>
        <button disabled={disabled} class="asset-remove" onclick={() => remove(asset.assetId)} aria-label={`Odebrat ${asset.name}`}>×</button>
      </div>
    {/each}
    {#if document.world.backgroundAssetId}<button class="asset-clear" disabled={disabled} onclick={() => setBackground(null)}>Použít barvu pozadí</button>{/if}
    {#if error}<small class="asset-error" role="alert">{error}</small>{/if}
  </div>
</details>
