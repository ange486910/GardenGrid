import { readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: 'utf8' });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  if (result.status !== 0) { if (result.stdout) process.stderr.write(result.stdout); if (result.stderr) process.stderr.write(result.stderr); process.exit(result.status ?? 1); }
}
function walk(directory) {
  const files = [];
  for (const name of readdirSync(directory)) {
    if (['node_modules', 'data', '.git'].includes(name)) continue;
    const path = join(directory, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}
run(['scripts/baseline-check.mjs']);
run(['scripts/style-check.mjs']);
for (const file of walk('src').concat(walk('scripts'), walk('tests'))) {
  if (['.js', '.mjs'].includes(extname(file))) run(['--check', file]);
}
run(['--test']);
console.log(JSON.stringify({ status: 'ok', checks: ['syntax', 'tests'] }));

