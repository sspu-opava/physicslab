import { describe, expect, it } from 'vitest';
import { createDocument } from './createDocument';
import { AssetManager } from './AssetManager';
import { deserializeProject, serializeProject } from './ProjectSerializer';
import { SceneEditor } from '../scene/SceneEditor';
import { createJoint } from '../physics/joints/joints';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9gDeAAAAAASUVORK5CYII=';
const asset = { assetId: 'background-1', name: 'pozadi.png', mimeType: 'image/png' as const, dataUrl: `data:image/png;base64,${png}`, sizeBytes: Buffer.from(png, 'base64').length };

describe('project files', () => {
  it('preserves embedded assets and their document references through save and load', () => {
    const editor = new SceneEditor(createDocument());
    editor.addAsset(asset);
    editor.setBackgroundAsset(asset.assetId);
    const loaded = deserializeProject(serializeProject(editor.document));
    expect(loaded.world.backgroundAssetId).toBe(asset.assetId);
    expect(AssetManager.find(loaded, asset.assetId)).toEqual(asset);
    editor.undo();
    expect(editor.document.world.backgroundAssetId).toBeNull();
    editor.redo();
    editor.removeAsset(asset.assetId);
    expect(editor.document.world.backgroundAssetId).toBeNull();
  });

  it('opens version-one projects created before assets were added', () => {
    const old = structuredClone(createDocument()) as unknown as Record<string, unknown>;
    delete old.assets;
    delete (old.world as Record<string, unknown>).backgroundAssetId;
    const loaded = deserializeProject(JSON.stringify({ format: 'physicslab', version: 1, document: old }));
    expect(loaded.assets).toEqual([]);
    expect(loaded.world.backgroundAssetId).toBeNull();
    expect(serializeProject(loaded)).toContain('"assets": []');
  });

  it('rejects malformed objects and values before they can replace the scene', () => {
    const file = (document: unknown) => JSON.stringify({ format: 'physicslab', version: 1, document });
    const missingBody = createDocument() as unknown as Record<string, unknown>;
    missingBody.bodies = [null];
    expect(() => deserializeProject(file(missingBody))).toThrow(/jedinečné/);

    const zeroScale = createDocument();
    zeroScale.world.pixelsPerMeter = 0.000001;
    expect(() => deserializeProject(file(zeroScale))).toThrow(/nastavení světa/);

    const invalidColor = createDocument();
    invalidColor.bodies[1].appearance.fill = 'invalid';
    expect(() => deserializeProject(file(invalidColor))).toThrow(/vzhled/);

    const invalidJoint = createDocument();
    const joint = createJoint('revolute', invalidJoint.bodies[0], invalidJoint.bodies[1], 'j1');
    if (joint.type !== 'revolute') throw new Error('Expected revolute joint');
    (joint as unknown as Record<string, unknown>).enableLimit = 'yes';
    invalidJoint.joints.push(joint);
    expect(() => deserializeProject(file(invalidJoint))).toThrow(/nastavení mezí/);

    const wrongImage = createDocument();
    wrongImage.assets = [{ ...asset, mimeType: 'image/jpeg' }];
    expect(() => deserializeProject(file(wrongImage))).toThrow(/obrazová data|formátu obrázku/);
  });
});
