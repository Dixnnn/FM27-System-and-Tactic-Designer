// End-to-end check of the built single-file app in a real browser (Chromium via Playwright).
// Run: npm run test:e2e   (needs Playwright with Chromium installed; skipped otherwise)

import { createRequire } from 'node:module';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { ROOT, SAMPLE_FILES } from '../helpers.js';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.log('Playwright is not installed: skipping the browser test.');
  process.exit(0);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const problems = [];
const external = [];
page.on('pageerror', (e) => problems.push(e.message));
page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
page.on('request', (r) => !/^(file|data|blob):/.test(r.url()) && external.push(r.url()));

await page.goto('file://' + join(ROOT, 'FM27-Tactic-Builder.html'));
for (const file of SAMPLE_FILES) {
  await page.setInputFiles('#file', join(ROOT, 'samples', file));
  await page.waitForSelector('#result:not(.hidden) .report', { timeout: 15000 });
  const sections = await page.$$eval('.report section', (els) => els.map((e) => e.id));
  assert.deepEqual(sections, ['overview', 'setup', 'why', 'depth', 'alternatives', 'training', 'suitability', 'data'], file);
  assert.equal(await page.$$eval('#overview svg.pitch', (els) => els.length), 2, file);
  console.log(`ok  ${file}`);
  await page.click('#again');
}

// Team strength changes the mentality (and is remembered)
await page.selectOption('#opt-strength', '-2');
await page.click('#sample');
await page.waitForSelector('#result:not(.hidden) .report');
const under = await page.textContent('#overview .kpis');
assert.match(under, /Defensive|Cautious/);
assert.match(await page.textContent('.report .meta'), /underdogs/);
console.log('ok  sample button + team strength (underdogs)');
await page.click('#again');
await page.reload();
assert.equal(await page.inputValue('#opt-strength'), '-2', 'strength answer remembered');
await page.selectOption('#opt-strength', '0');
await page.click('#sample');
await page.waitForSelector('#result:not(.hidden) .report');

const [download] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
assert.match(download.suggestedFilename(), /^FM27 tactic - Harbour City - \d{4}-\d{2}-\d{2}\.html$/);
console.log('ok  save report');

await page.click('#again');
await page.setInputFiles('#file', { name: 'notes.csv', mimeType: 'text/csv', buffer: Buffer.from('Name,Club\nA,B\n') });
await page.waitForSelector('#status .error');
console.log('ok  friendly error for a file without attributes');

await browser.close();
assert.deepEqual(problems, [], 'no errors in the page');
assert.deepEqual(external, [], 'no network requests');
console.log('All browser checks passed.');
