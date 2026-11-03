#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const required = ['README.md', 'CHANGELOG.md', 'SECURITY.md', 'CONTRIBUTING.md', '.github/CODEOWNERS', '.github/workflows/ci.yml', '.github/workflows/codeql.yml'];
const missing = required.filter((path) => !existsSync(path));
const changelog = existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf8') : '';
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error('package version must be semantic');
if (!changelog.includes(`## [${pkg.version}]`)) throw new Error('CHANGELOG must contain the package version');
const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
if (!ci.includes('security-check.mjs') || !ci.includes('verify.mjs')) throw new Error('CI does not run required gates');
console.log(JSON.stringify({ status: missing.length === 0 ? 'ok' : 'failed', version: pkg.version, missing }, null, 2));
if (missing.length > 0) process.exit(1);