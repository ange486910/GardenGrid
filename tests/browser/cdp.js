import { spawn } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = process.env.EDGE_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const LOCK = join(tmpdir(), 'gardengrid-edge-suite.lock');

async function acquireBrowserLock() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const handle = openSync(LOCK, 'wx');
      writeFileSync(handle, String(process.pid));
      closeSync(handle);
      return () => {
        try { unlinkSync(LOCK); } catch { /* another worker may have cleaned it */ }
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - statSync(LOCK).mtimeMs > 20_000) unlinkSync(LOCK);
      } catch { /* lock changed while checking */ }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error('browser test lock timed out');
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function findTarget(port) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page');
      if (page) return page;
    } catch { /* browser is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('browser debugging endpoint did not start');
}

export async function launchGardenBrowser(url) {
  const releaseLock = await acquireBrowserLock();
  const port = await freePort();
  const profile = mkdtempSync(join(tmpdir(), 'gardengrid-edge-'));
  const process = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--disable-extensions', '--no-first-run',
    '--no-default-browser-check', '--no-proxy-server', `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: 'ignore', windowsHide: true });
  let launched = false;
  try {
    const page = await findTarget(port);
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let nextId = 0;
    const pending = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const item = pending.get(message.id);
      if (!item) return;
      pending.delete(message.id);
      if (message.error) item.reject(new Error(message.error.message));
      else item.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'browser evaluation failed');
      return result.result.value;
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url });
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await evaluate('document.readyState === "complete"')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    launched = true;
    return {
      evaluate,
      async waitFor(expression, timeoutMs = 8000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          if (await evaluate(expression)) return true;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error(`browser condition timed out: ${expression}`);
      },
      async close() {
        try {
          await Promise.race([
            send('Browser.close'),
            new Promise((resolve) => setTimeout(resolve, 500))
          ]);
        } catch { /* socket may close first */ }
        socket.close();
        process.kill();
        releaseLock();
        await new Promise((resolve) => setTimeout(resolve, 250));
        try { rmSync(profile, { recursive: true, force: true }); } catch { /* profile lock is released later */ }
      }
    };
  } finally {
    if (!launched) {
      process.kill();
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* profile may still be locked */ }
      releaseLock();
    }
  }
}
