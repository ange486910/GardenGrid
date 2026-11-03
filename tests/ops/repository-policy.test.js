import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
test('repository policy and automation files are present', () => {
  for (const path of ['.github/CODEOWNERS', '.github/pull_request_template.md', 'CONTRIBUTING.md', 'SECURITY.md', '.github/workflows/ci.yml', '.github/workflows/codeql.yml']) {
    assert.equal(existsSync(path), true, path);
  }
  assert.match(readFileSync('.github/CODEOWNERS', 'utf8'), /@ange486910/);
  assert.match(readFileSync('.github/workflows/ci.yml', 'utf8'), /node scripts\/verify\.mjs/);
});