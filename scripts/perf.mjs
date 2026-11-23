#!/usr/bin/env node
/**
 * Relative frame-cost probe (T14). Headless Chromium renders WebGL in SOFTWARE here, so absolute numbers are huge;
 * compare ratios between configurations (they track GPU fragment/vertex load well).
 *
 *   npm run perf                              # default set
 *   npm run perf -- medium:1:960 low:1:960:view=castle-mars
 *   PERF_URL=http://localhost:5173/ npm run perf   # reuse a running dev server
 *
 * A config is `quality:dpr:width[:extra query params joined by &]`, e.g. `medium:1:960:software=0&detail=1`.
 * Extra params are the T14 overrides understood by src/perf/params.ts (software=0|1, detail=0|1|2, dpr=, shadows=0|1,
 * mist=0|1) plus any app param (view=...). The probe forces frameloop=always (demand=0) so that rAF gaps measure
 * real render cost. It prints average frame time plus renderer.info (calls/triangles) read from window.__perf.
 */
import { spawn, execSync } from 'node:child_process';
import net from 'node:net';
import { createRequire } from 'node:module';
import path from 'node:path';

const DEFAULTS = ['high:1:960', 'medium:1:960', 'low:1:960', 'high:2:960'];
const configs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULTS;
const FRAMES = Number(process.env.PERF_FRAMES ?? 6);

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const root = execSync('npm root -g').toString().trim();
    return createRequire(path.join(root, 'noop.js'))('playwright');
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not start at ${url}`);
}

let server;
let base = process.env.PERF_URL;
if (!base) {
  const port = await freePort();
  base = `http://localhost:${port}/`;
  server = spawn(path.resolve('node_modules/.bin/vite'), ['--port', String(port), '--strictPort'], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  await waitForServer(base);
}

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const rows = [];
try {
  for (const cfg of configs) {
    const [q, dpr, w, extra] = cfg.split(':');
    const width = Number(w || 960);
    const page = await browser.newPage({
      viewport: { width, height: Math.round(width * 0.625) },
      deviceScaleFactor: Number(dpr || 1),
    });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    const qs = new URLSearchParams({ view: 'overview', intro: '0', ui: '0', quality: q, demand: '0' });
    for (const [k, v] of new URLSearchParams(extra ?? '')) qs.set(k, v);
    const t0 = Date.now();
    await page.goto(`${base}?${qs}`);
    await page.waitForSelector('body[data-ready="true"]', { timeout: 300000 });
    const loadS = (Date.now() - t0) / 1000;
    await page.waitForTimeout(500);
    const ms = await page.evaluate(
      (n) =>
        new Promise((res) => {
          const t = [];
          let last = performance.now();
          const f = (now) => {
            t.push(now - last);
            last = now;
            if (t.length <= n) requestAnimationFrame(f);
            else res(t.slice(1));
          };
          requestAnimationFrame(f);
        }),
      FRAMES,
    );
    const info = await page.evaluate(() => (window.__perf ? window.__perf.snapshot() : null));
    const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
    rows.push({ cfg, avg, errs });
    const flags = info
      ? ` calls ${info.calls} tris ${info.triangles} | software=${info.flags.software} dpr=${info.flags.dpr} detail=${info.flags.detail} shadows=${info.flags.shadows} mist=${info.flags.mist}`
      : '';
    console.log(
      `${cfg.padEnd(34)} ${avg.toFixed(0).padStart(5)} ms/frame  load ${loadS.toFixed(1)}s${flags}`,
    );
    if (process.env.PERF_BREAKDOWN)
      console.log('  ', (await page.evaluate(() => window.__perf?.breakdown()))?.join(' | '));
    if (errs.length) console.log('  page errors:', errs.join(' | '));
    await page.close();
  }
} finally {
  await browser.close();
  server?.kill();
}
if (rows.some((r) => r.errs.length)) process.exitCode = 1;
