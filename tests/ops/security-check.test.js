import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
test('security scan reports a clean tracked tree', () => {
  const result = spawnSync(process.execPath, ['scripts/security-check.mjs'], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, 'ok');
});