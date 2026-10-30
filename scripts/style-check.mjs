import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const FILLER = /\b(comprehensive|robust|seamless|leverage|delve|crucial|this module|this file)\b/i;
const violations = [];
const files = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
}

walk('src');
for (const file of files) {
  if (!['.js', '.mjs'].includes(extname(file))) continue;
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.length > 200) violations.push({ file, line: lineNumber, rule: 'line-too-long', length: line.length });
    if (/^\s*(\/\/|\*)/.test(line) && FILLER.test(line)) violations.push({ file, line: lineNumber, rule: 'filler-comment' });
    if (/\b(TODO|FIXME)\b/.test(line) && !/TODO\(#\d+\)|FIXME\(#\d+\)/.test(line)) violations.push({ file, line: lineNumber, rule: 'untracked-todo' });
    if (/\p{Extended_Pictographic}/u.test(line)) violations.push({ file, line: lineNumber, rule: 'emoji' });
  });
}

console.log(JSON.stringify({ status: violations.length === 0 ? 'ok' : 'failed', checkedFiles: files.length, violations }, null, 2));
if (violations.length > 0) process.exit(1);
