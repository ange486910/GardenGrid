#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const patterns = [
  { name: 'private-key', regex: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/ },
  { name: 'aws-access-key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'github-token', regex: /gh[pousr]_[A-Za-z0-9]{36}/ },
  { name: 'private-http-host', regex: /https?:\/\/(?:10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.)/ },
  { name: 'home-directory-path', regex: /[A-Za-z]:\\Users\\[^\\\s]+/ }
];
const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
const findings = [];
for (const file of files) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  for (const pattern of patterns) if (pattern.regex.test(text)) findings.push({ file, rule: pattern.name });
}
console.log(JSON.stringify({ status: findings.length === 0 ? 'ok' : 'failed', checkedFiles: files.length, findings }, null, 2));
if (findings.length > 0) process.exit(1);