#!/usr/bin/env node
/**
 * Visual verification tool: renders named camera views of the app to screenshots/<view>.png.
 * Agents MUST run this after visual changes and look at the images before reporting done.
 *
 *   npm run shot                      # default set
 *   npm run shot -- castle-mars olympus overview-winter
 *   SHOT_URL=http://localhost:5173 npm run shot   # reuse a running dev server
 *   SHOT_SIZE=1280x720 npm run shot
 *
 * Any place id from src/world/layout.ts is a valid view; append "-winter" for the winter season.
 * Also prints browser console errors — a non-empty error list means the change is not done.
 */
import { spawn, execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const DEFAULT_VIEWS = ['overview', 'overview-winter', 'castle-mars', 'olympus', 'castle-ceres', 'greatwoods'];
const views = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_VIEWS;
const [W, H] = (process.env.SHOT_SIZE ?? '1440x900').split('x').map(Number);
const outDir = path.resolve('screenshots');
mkdirSync(outDir, { recursive: true });

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    // Cloud sessions ship a global Playwright + Chromium; locally run: npm i -D playwright && npx playwright install chromium
    const root = execSync('npm root -g').toString().trim();
    return createRequire(path.join(root, 'noop.js'))('playwright');
  }
}

async function waitForServer(url, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not start at ${url}`);
}

let server;
let base = process.env.SHOT_URL;
if (!base) {
  const port = 5199;
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
const errors = [];
try {
  for (const view of views) {
    const winter = view.endsWith('-winter');
    const shot = winter ? view.slice(0, -'-winter'.length) : view;
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    page.on('console', (m) => m.type() === 'error' && errors.push(`[${view}] ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`[${view}] ${e.message}`));
    const qs = new URLSearchParams({ view: shot, intro: '0', season: winter ? 'winter' : 'summer' });
    if (process.env.SHOT_UI !== '1') qs.set('ui', '0');
    const t0 = Date.now();
    await page.goto(`${base}?${qs}`);
    await page.waitForSelector('body[data-ready="true"]', { timeout: 120000 });
    await page.waitForTimeout(Number(process.env.SHOT_SETTLE_MS ?? 1200));
    const file = path.join(outDir, `${view}.png`);
    await page.screenshot({ path: file });
    console.log(
      `✓ ${view.padEnd(22)} ${((Date.now() - t0) / 1000).toFixed(1)}s  ${path.relative(process.cwd(), file)}`,
    );
    await page.close();
  }
} finally {
  await browser.close();
  server?.kill();
}
if (errors.length) {
  console.error(`\n${errors.length} browser error(s):\n` + errors.join('\n'));
  process.exitCode = 1;
}
