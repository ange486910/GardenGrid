import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
};

export function gardenAssetPath(root, requestPath) {
  let decoded;
  try { decoded = decodeURIComponent(requestPath); } catch { return null; }
  if (!decoded.startsWith('/') || decoded.includes('\0') || decoded.split('/').includes('..')) return null;
  const relative = decoded.endsWith('/') ? `${decoded}index.html` : decoded;
  const candidate = resolve(root, `.${relative}`);
  return candidate.startsWith(`${resolve(root)}${sep}`) ? candidate : null;
}

export async function readGardenAsset(root, requestPath) {
  const path = gardenAssetPath(root, requestPath);
  if (!path) return null;
  try {
    const info = await stat(path);
    if (!info.isFile()) return null;
    const body = await readFile(path);
    return {
      body,
      size: info.size,
      contentType: TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
      etag: `"${createHash('sha256').update(body).digest('hex').slice(0, 20)}"`
    };
  } catch {
    return null;
  }
}
