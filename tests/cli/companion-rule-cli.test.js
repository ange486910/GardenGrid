import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('CLI adds, lists and deletes a companion rule', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gardengrid-rule-cli-'));
  const database = join(directory, 'garden.sqlite');
  try {
    const added = spawnSync(process.execPath, [
      'src/cli/index.js', 'companion-rule-add', '--database', database,
      '--crop-a', 'tomato', '--crop-b', 'basil', '--type', 'companion', '--note', 'Grow together'
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(added.status, 0, added.stderr);
    const rule = JSON.parse(added.stdout).rule;
    assert.deepEqual(rule.pair, ['basil', 'tomato']);

    const listed = spawnSync(process.execPath, ['src/cli/index.js', 'companion-rules', '--database', database], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(JSON.parse(listed.stdout).rules.length, 1);
    const removed = spawnSync(process.execPath, ['src/cli/index.js', 'companion-rule-delete', '--database', database, '--rule', rule.id], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(removed.status, 0, removed.stderr);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
