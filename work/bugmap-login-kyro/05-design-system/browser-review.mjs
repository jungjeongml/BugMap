import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function browserPath(explicit) {
  if (explicit) { if (!existsSync(explicit)) throw new Error(`Browser not found: ${explicit}`); return explicit; }
  const candidates = process.platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']
    : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/opt/google/chrome/chrome'];
  const path = candidates.find(existsSync);
  if (!path) throw new Error('Installed Chromium required; specify --browser <executable>');
  return path;
}
// Chromium exposes null-delimited CDP over pipes, avoiding WebSocket dependencies
// (Node 20 has no stable built-in WebSocket). Every run uses its own temp profile.
export async function withBrowser(options, action) {
  const executable = browserPath(options.browser);
  const profile = mkdtempSync(join(tmpdir(), 'design-harness-chrome-'));
  const child = spawn(executable, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
  const pending = new Map(), listeners = new Set();
  let sequence = 0, buffer = '', stderr = '', ended = false;
  child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-4000); });
  function fail(error) {
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(error); }
    pending.clear();
    for (const listener of listeners) listener.reject(error);
    listeners.clear();
  }
  child.on('error', fail);
  const exited = new Promise(resolve => child.once('close', () => { ended = true; fail(new Error(`Chromium exited: ${stderr}`)); resolve(); }));
  child.stdio[3].on('error', fail);
  child.stdio[4].setEncoding('utf8');
  child.stdio[4].on('data', data => {
    buffer += data;
    let end;
    while ((end = buffer.indexOf('\0')) !== -1) {
      const raw = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      if (!raw) continue;
      let message;
      try { message = JSON.parse(raw); } catch { fail(new Error('Invalid Chromium protocol response')); return; }
      if (message.id) {
        const entry = pending.get(message.id);
        if (entry) { pending.delete(message.id); clearTimeout(entry.timer); message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result); }
      } else for (const listener of [...listeners]) if (message.method === listener.method && message.sessionId === listener.sessionId) listener.resolve(message.params);
    }
  });
  function send(method, params = {}, sessionId) {
    if (ended) return Promise.reject(new Error('Chromium is closed'));
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Chromium timeout: ${method}`)); }, 20000);
      pending.set(id, { resolve, reject, timer });
      child.stdio[3].write(`${JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })}\0`);
    });
  }
  function event(method, sessionId) {
    let timer, listener;
    const promise = new Promise((resolve, reject) => {
      listener = { method, sessionId, resolve: value => { clearTimeout(timer); listeners.delete(listener); resolve(value); },
        reject: error => { clearTimeout(timer); listeners.delete(listener); reject(error); } };
      timer = setTimeout(() => listener.reject(new Error(`Chromium timeout: ${method}`)), 20000);
      listeners.add(listener);
    });
    // Navigation may fail before awaiting the load promise.
    promise.catch(() => {});
    return { promise, cancel: () => { clearTimeout(timer); listeners.delete(listener); } };
  }
  try {
    await send('Browser.getVersion');
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const cdp = (method, params) => send(method, params, sessionId);
    await cdp('Page.enable');
    const page = {
      cdp, // Stage-5 review only: expose CDP for actual platform font evidence.
      async goto(url, viewport) {
        await cdp('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1, mobile: false });
        const load = event('Page.loadEventFired', sessionId);
        try {
          const result = await cdp('Page.navigate', { url });
          if (result.errorText) throw new Error(`Navigation failed: ${result.errorText}`);
          await load.promise;
          await page.evaluate(`(async () => { if (document.fonts) await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return true; })()`);
        } finally { load.cancel(); }
      },
      async evaluate(expression) {
        const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(`Page evaluation failed: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`);
        return result.result.value;
      },
      async screenshot() {
        const { data } = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        return Buffer.from(data, 'base64');
      },
    };
    return await action(page);
  } finally {
    fail(new Error('Browser session ended'));
    child.kill('SIGTERM');
    let timer;
    await Promise.race([exited, new Promise(resolve => { timer = setTimeout(resolve, 2000); })]);
    clearTimeout(timer);
    if (!ended) { child.kill('SIGKILL'); await exited; }
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
