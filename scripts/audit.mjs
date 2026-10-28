import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const CODE = /\.(js|mjs|cjs|sql|css|html)$/;
const tracked = git(['ls-files']).split(/\r?\n/).filter(Boolean);
const codeFiles = tracked.filter((file) => CODE.test(file));
const commits = Number(git(['rev-list', '--count', 'HEAD']));
const hashes = git(['log', '--format=%H']).split(/\r?\n/).filter(Boolean).slice(0, 60);
const docsOnly = [];
for (const hash of hashes) {
  const changed = git(['show', '--name-only', '--pretty=format:', hash]).split(/\r?\n/).filter(Boolean);
  if (changed.length > 0 && changed.every((file) => file.endsWith('.md'))) docsOnly.push(hash.slice(0, 7));
}
const tests = [];
for (let index = 0; index < 2; index += 1) {
  const run = spawnSync(process.execPath, ['--test'], { cwd: process.cwd(), encoding: 'utf8' });
  tests.push({ run: index + 1, status: run.status, ok: run.status === 0 });
}
const result = {
  status: tests.every((run) => run.ok) && docsOnly.length === 0 ? 'ok' : 'failed',
  commits,
  codeFiles: codeFiles.length,
  codeFileTarget: 100,
  remainingCodeFiles: Math.max(0, 100 - codeFiles.length),
  docsOnlyCommits: docsOnly,
  tests,
  gates: {
    twoConsecutiveRuns: tests.every((run) => run.ok),
    everyCommitHasNonMarkdownChange: docsOnly.length === 0,
    codeFileTargetReached: codeFiles.length >= 100
  }
};
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'ok') process.exit(1);
