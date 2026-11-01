import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gardenAssetPath, readGardenAsset } from '../../src/web/asset-store.js';

test('garden asset store resolves files and emits stable ETags', async () => {
  const root = mkdtempSync(join(tmpdir(), 'gardengrid-assets-'));
  try {
    mkdirSync(join(root, 'views'));
    writeFileSync(join(root, 'index.html'), '<main>Garden</main>');
    writeFileSync(join(root, 'views', 'board.js'), 'export const board = true;');
    const index = await readGardenAsset(root, '/');
    const first = await readGardenAsset(root, '/views/board.js');
    const second = await readGardenAsset(root, '/views/board.js');
    assert.equal(index.contentType, 'text/html; charset=utf-8');
    assert.equal(first.etag, second.etag);
    assert.match(first.etag, /^".+"$/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('garden asset store rejects parent traversal and malformed encoding', () => {
  const root = join(process.cwd(), 'public');
  assert.equal(gardenAssetPath(root, '/../secret'), null);
  assert.equal(gardenAssetPath(root, '/%2e%2e/secret'), null);
  assert.equal(gardenAssetPath(root, '/%E0%A4%A'), null);
});
