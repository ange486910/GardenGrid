import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdtempSync, openSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BROWSER_CANDIDATES = [
  process.env.BROWSER_PATH,
  process.env.CHROME_PATH,
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);

function browserExecutable() {
  const executable = BROWSER_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!executable) throw new Error('Chromium browser executable not found');
  return executable;
}
const LOCK = join(tmpdir(), 'gardengrid-edge-suite.lock');

function terminateBrowser(child) {
  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  } else {
    child.kill('SIGKILL');
  }
}

async function acquireBrowserLock() {
  const deadline = Date.now() + 20_000;
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
        if (Date.now() - statSync(LOCK).mtimeMs > 120_000) unlinkSync(LOCK);
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

async function findTarget(port, getSpawnError) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (getSpawnError()) throw getSpawnError();
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
  const executable = browserExecutable();
  const releaseLock = await acquireBrowserLock();
  const port = await freePort();
  const profile = mkdtempSync(join(tmpdir(), 'gardengrid-edge-'));
  const process = spawn(executable, [
    '--headless=new', '--disable-gpu', '--disable-extensions', '--no-first-run',
    '--no-default-browser-check', '--no-proxy-server', `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: 'ignore', windowsHide: true });
  let spawnError = null;
  let launched = false;
  process.once('error', (error) => { spawnError = error; });
  try {
    const page = await findTarget(port, () => spawnError);
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('browser socket open timed out')), 5000);
      socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener('error', (error) => { clearTimeout(timer); reject(error); }, { once: true });
    });
    let nextId = 0;
    const pending = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const item = pending.get(message.id);
      if (!item) return;
      pending.delete(message.id);
      clearTimeout(item.timer);
      if (message.error) item.reject(new Error(message.error.message));
      else item.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 5000);
      pending.set(id, { resolve, reject, timer });
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
        terminateBrowser(process);
        releaseLock();
        await new Promise((resolve) => setTimeout(resolve, 250));
        try { rmSync(profile, { recursive: true, force: true }); } catch { /* profile lock is released later */ }
      }
    };
  } finally {
    if (!launched) {
      terminateBrowser(process);
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* profile may still be locked */ }
      releaseLock();
    }
  }
}
