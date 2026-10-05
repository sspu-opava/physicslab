import type { PhysicsDocument, ProjectAsset } from './types';

const supportedTypes = new Set<ProjectAsset['mimeType']>(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
export const MAX_ASSET_BYTES = 8 * 1024 * 1024;
export const MAX_PROJECT_ASSET_BYTES = 16 * 1024 * 1024;

export class AssetManager {
  static async importFile(file: File): Promise<ProjectAsset> {
    if (!supportedTypes.has(file.type as ProjectAsset['mimeType'])) throw new Error('Podporované jsou pouze obrázky PNG, JPEG, WebP a GIF.');
    if (file.size <= 0 || file.size > MAX_ASSET_BYTES) throw new Error('Obrázek musí mít velikost do 8 MiB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    const asset: ProjectAsset = {
      assetId: crypto.randomUUID(),
      name: file.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 120) || 'obrázek',
      mimeType: file.type as ProjectAsset['mimeType'],
      dataUrl: `data:${file.type};base64,${btoa(binary)}`,
      sizeBytes: file.size,
    };
    this.validate(asset);
    return asset;
  }

  static validate(asset: ProjectAsset): void {
    if (!asset.assetId.trim() || !asset.name.trim() || !supportedTypes.has(asset.mimeType)) throw new Error('Asset nemá platné ID, název nebo typ obrázku.');
    if (!Number.isInteger(asset.sizeBytes) || asset.sizeBytes <= 0 || asset.sizeBytes > MAX_ASSET_BYTES) throw new Error(`Asset ${asset.name} překračuje limit 8 MiB.`);
    const prefix = `data:${asset.mimeType};base64,`;
    if (!asset.dataUrl.startsWith(prefix) || !/^[A-Za-z0-9+/]+={0,2}$/.test(asset.dataUrl.slice(prefix.length))) throw new Error(`Asset ${asset.name} neobsahuje platná vložená obrazová data.`);
    const encoded = asset.dataUrl.slice(prefix.length);
    const decodedBytes = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
    if (decodedBytes > MAX_ASSET_BYTES || Math.abs(decodedBytes - asset.sizeBytes) > 2) throw new Error(`Asset ${asset.name} má nesouhlasnou velikost obrazových dat.`);
  }

  static add(document: PhysicsDocument, asset: ProjectAsset): PhysicsDocument {
    this.validate(asset);
    if (document.assets.some(item => item.assetId === asset.assetId)) throw new Error('Asset s tímto ID už existuje.');
    if (document.assets.reduce((sum, item) => sum + item.sizeBytes, 0) + asset.sizeBytes > MAX_PROJECT_ASSET_BYTES) throw new Error('Součet obrázků v projektu nesmí překročit 16 MiB.');
    return { ...document, assets: [...document.assets, structuredClone(asset)], modifiedAt: new Date().toISOString() };
  }

  static remove(document: PhysicsDocument, assetId: string): PhysicsDocument {
    if (!document.assets.some(asset => asset.assetId === assetId)) return document;
    return { ...document, assets: document.assets.filter(asset => asset.assetId !== assetId), world: { ...document.world, backgroundAssetId: document.world.backgroundAssetId === assetId ? null : document.world.backgroundAssetId }, modifiedAt: new Date().toISOString() };
  }

  static find(document: PhysicsDocument, assetId: string | null): ProjectAsset | undefined {
    return assetId ? document.assets.find(asset => asset.assetId === assetId) : undefined;
  }
}
