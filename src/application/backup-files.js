import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
function stamp(value) { return value.replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z'); }
export async function writeBackupSnapshot({ directory, prefix, backup, validate }) {
  validate(backup); await mkdir(directory, { recursive: true });
  const base = `${prefix}-${stamp(backup.generatedAt)}.json`; const target = join(directory, base);
  await writeFile(`${target}.tmp`, `${JSON.stringify(backup, null, 2)}\n`, 'utf8'); await rename(`${target}.tmp`, target);
  await writeFile(`${target}.sha256`, `${backup.checksum}  ${base}\n`, 'utf8'); return { path: target, checksum: backup.checksum };
}
export async function verifyBackupSnapshot(path, validate) {
  const backup = JSON.parse(await readFile(path, 'utf8')); validate(backup);
  const sidecar = (await readFile(`${path}.sha256`, 'utf8')).trim().split(/\s+/)[0];
  if (sidecar !== backup.checksum) throw new Error('backup sidecar checksum does not match'); return backup;
}
export async function pruneBackupSnapshots({ directory, prefix, keep }) {
  const names = await readdir(directory); const files = names.filter((name) => name.startsWith(`${prefix}-`) && name.endsWith('.json')).sort().reverse();
  const removed = [];
  for (const name of files.slice(keep)) {
    const path = join(directory, name);
    const info = await stat(path);
    await unlink(path);
    try { await unlink(`${path}.sha256`); } catch { /* sidecar may already be gone */ }
    removed.push({ name, modifiedAt: info.mtime.toISOString() });
  }
  return removed;
}
