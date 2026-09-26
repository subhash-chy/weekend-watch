#!/usr/bin/env node
/**
 * Lighthouse runner.
 *
 * Builds the app, serves `dist/` through `vite preview` (so the measured server
 * sends the same security headers production will), audits the key routes, and
 * fails the process if any category drops below the threshold.
 *
 * Requires a Chrome/Chromium binary. Set CHROME_PATH if it is not on PATH.
 *
 * Usage:
 *   node scripts/lighthouse.mjs                  # audit the default routes
 *   node scripts/lighthouse.mjs /search?q=neon   # audit specific routes
 *
 * Environment:
 *   LH_THRESHOLD  Minimum score per category, 0–100. Default 95.
 *   LH_PORT       Preview server port. Default 4173.
 *   CHROME_PATH   Path to a Chrome/Chromium executable.
 */

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const THRESHOLD = Number(process.env.LH_THRESHOLD ?? 95);
const PORT = Number(process.env.LH_PORT ?? 4173);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/** Routes audited by default. */
const DEFAULT_ROUTES = ['/', '/search?query=neon', '/does-not-exist'];

/**
 * Runs a shell command and resolves when it exits.
 *
 * @param command - Executable.
 * @param args - Arguments.
 * @returns The exit code.
 */
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

/**
 * Starts the preview server and waits until it accepts connections.
 *
 * @returns The child process, so the caller can terminate it.
 */
async function startPreview() {
  const child = spawn(
    process.execPath,
    [
      join(ROOT, 'node_modules/vite/bin/vite.js'),
      'preview',
      '--port',
      String(PORT),
      '--strictPort',
    ],
    { stdio: 'ignore', detached: false },
  );

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) return child;
    } catch {
      // Not listening yet.
    }
    await sleep(250);
  }
  child.kill('SIGTERM');
  throw new Error(`Preview server did not become ready on ${BASE_URL}`);
}

/**
 * Audits one URL.
 *
 * @param lighthouse - The lighthouse module.
 * @param chrome - The launched Chrome instance.
 * @param url - Absolute URL to audit.
 * @returns The lighthouse result.
 */
async function audit(lighthouse, chrome, url) {
  return lighthouse.default(
    url,
    {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      // Simulate a mid-tier mobile device, which is Lighthouse's default and
      // the harsher of the two form factors.
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75 },
    },
    { extends: 'lighthouse:default' },
  );
}

/**
 * Main entry point.
 *
 * @returns Process exit code.
 */
async function main() {
  const routes =
    process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_ROUTES;

  console.log('▸ Building…');
  if (
    (await run(process.execPath, [
      join(ROOT, 'node_modules/vite/bin/vite.js'),
      'build',
    ])) !== 0
  ) {
    console.error('Build failed.');
    return 1;
  }

  let lighthouse;
  let chromeLauncher;
  try {
    lighthouse = await import('lighthouse');
    chromeLauncher = await import('chrome-launcher');
  } catch {
    console.error(
      '\nLighthouse is not installed. Run `npm install` first.\n' +
        'A Chrome or Chromium binary is also required; set CHROME_PATH if it is not on PATH.',
    );
    return 1;
  }

  console.log(`▸ Starting preview server on ${BASE_URL}…`);
  const preview = await startPreview();

  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  } catch (error) {
    preview.kill('SIGTERM');
    console.error('\nCould not launch Chrome:', error.message);
    console.error('Set CHROME_PATH to a Chrome/Chromium executable and retry.');
    return 1;
  }

  const rows = [];
  let failures = 0;

  try {
    for (const route of routes) {
      const url = `${BASE_URL}${route}`;
      console.log(`\n▸ Auditing ${url}`);
      const result = await audit(lighthouse, chrome, url);
      const categories = result?.lhr.categories ?? {};
      const scores = {
        performance: (categories.performance?.score ?? 0) * 100,
        accessibility: (categories.accessibility?.score ?? 0) * 100,
        'best-practices': (categories['best-practices']?.score ?? 0) * 100,
        seo: (categories.seo?.score ?? 0) * 100,
      };

      const failing = Object.entries(scores).filter(([, v]) => v < THRESHOLD);
      failures += failing.length;
      rows.push({ route, ...scores, ok: failing.length === 0 });

      const metrics = result?.lhr.audits ?? {};
      const read = (id) => metrics[id]?.displayValue ?? '—';
      console.log(
        `  P=${scores.performance} A=${scores.accessibility} ` +
          `BP=${scores['best-practices']} SEO=${scores.seo}`,
      );
      console.log(
        `  LCP=${read('largest-contentful-paint')} CLS=${read('cumulative-layout-shift')} ` +
          `TBT=${read('total-blocking-time')} SI=${read('speed-index')}`,
      );
      if (failing.length > 0) {
        console.log(
          `  ✗ below ${THRESHOLD}: ${failing.map(([k, v]) => `${k}=${v}`).join(', ')}`,
        );
      }
    }
  } finally {
    await chrome.kill();
    preview.kill('SIGTERM');
  }

  await mkdir(join(ROOT, 'reports'), { recursive: true });

  console.log('\n' + '='.repeat(72));
  console.log(
    ['route', 'perf', 'a11y', 'best', 'seo', 'result']
      .map((h, i) => h.padEnd(i === 0 ? 28 : 8))
      .join(''),
  );
  for (const row of rows) {
    console.log(
      [
        row.route.padEnd(28),
        String(row.performance).padEnd(8),
        String(row.accessibility).padEnd(8),
        String(row['best-practices']).padEnd(8),
        String(row.seo).padEnd(8),
        row.ok ? 'PASS' : 'FAIL',
      ].join(''),
    );
  }
  console.log('='.repeat(72));
  console.log(`Threshold: ${THRESHOLD}/100 per category.`);

  if (failures > 0) {
    console.log(`\n${failures} categor${failures === 1 ? 'y' : 'ies'} below threshold.`);
    return 1;
  }
  console.log('\nAll audited routes meet the threshold.');
  return 0;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
