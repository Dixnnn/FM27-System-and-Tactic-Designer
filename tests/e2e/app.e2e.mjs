// End-to-end check of the built single-file app in a real browser (Chromium via Playwright).
// Run: npm run test:e2e   (needs Playwright with Chromium installed; skipped otherwise)

import { createRequire } from 'node:module';
import { join } from 'node:path';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
await page.click('label:has(input[name="strength"][value="-2"])');
await page.click('#sample');
await page.waitForSelector('#result:not(.hidden) .report');
const under = await page.textContent('#overview .kpis');
assert.match(under, /Defensive|Cautious/);
assert.match(await page.textContent('.report .meta'), /underdogs/);
console.log('ok  sample button + team strength (underdogs)');
// Section bar: one link per section; jumping to a section underlines it
assert.equal(await page.$$eval('#secnav a', (as) => as.length), 8);
await page.click('#secnav a[data-id="depth"]');
await page.waitForFunction(() => document.querySelector('#secnav a.on')?.dataset.id === 'depth', null, { timeout: 5000 });
// Hovering a heatmap row keeps its colours
const cell = page.locator('#suitability table.matrix td.h').first();
await cell.scrollIntoViewIfNeeded();
const before = await cell.evaluate((td) => getComputedStyle(td).backgroundColor);
await cell.hover();
assert.equal(await cell.evaluate((td) => getComputedStyle(td).backgroundColor), before, 'hover keeps the heat colour');
console.log('ok  section bar follows the scroll; heatmap keeps colours on hover');
await page.click('#again');
await page.reload();
assert.equal(await page.$eval('input[name="strength"]:checked', (e) => e.value), '-2', 'strength answer remembered');
await page.click('label:has(input[name="strength"][value="0"])');
// Dark by default; the toggle switches to light and is remembered
assert.equal(await page.evaluate(() => document.documentElement.dataset.theme || 'dark'), 'dark');
await page.click('#theme-toggle');
assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
await page.reload();
assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light', 'theme remembered');
await page.click('#theme-toggle');
console.log('ok  theme toggle (dark default, light remembered)');
await page.click('#sample');
await page.waitForSelector('#result:not(.hidden) .report');

// Choose players: a marquee player and a must-start player, rebuilt and remembered
await page.click('#choose-players');
await page.waitForSelector('#picker:not(.hidden) .pk-row');
await page.locator('.pk-row', { hasText: 'Caleb Lindqvist' }).locator('label:has(input[value="marquee"])').click();
await page.locator('.pk-row', { hasText: 'Sami Pemberton' }).locator('.switch').click();
await page.click('#pk-apply');
await page.waitForFunction(() => document.querySelector('.report')?.textContent.includes('Built around your picks'), null, { timeout: 30000 });
const overviewText = await page.textContent('#overview');
assert.ok(overviewText.includes('Lindqvist') && overviewText.includes('Pemberton'), 'picked players start');
assert.equal(await page.textContent('#picks-badge'), '2');
console.log('ok  choose players: marquee + must start rebuild the tactic');
await page.click('#choose-players');
await page.locator('.pk-row', { hasText: 'Callum Ashdown' }).locator('.switch').click();
await page.locator('.pk-row', { hasText: 'Rafael Holloway' }).locator('.switch').click();
assert.ok(await page.isDisabled('#pk-apply'), 'two goalkeepers cannot be applied');
await page.click('#pk-clear');
await page.click('#pk-apply');
await page.waitForFunction(() => !document.querySelector('.report').textContent.includes('Built around your picks'), null, { timeout: 30000 });
console.log('ok  picks validated and cleared');

const [download] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
assert.match(download.suggestedFilename(), /^FM27 tactic - Harbour City - \d{4}-\d{2}-\d{2}\.html$/);
console.log('ok  save report');

// Opened by the FM27 plugin (F8): the squad sits in the page's slot and the tactic appears without a click.
// Same filling as plugin/src/FM27TacticBuilder.Core/TacticPage.cs (JSON with <, > and & escaped).
const SLOT = '<script type="application/json" id="fm27tb-export">null</script>';
const csv = readFileSync(join(ROOT, 'samples', 'squad_20261108_201500.csv'), 'utf8');
const json = JSON.stringify({ name: 'squad_20261110_180852.csv', exportedAt: '2026-11-10T18:08:52', source: 'Football Manager 27', text: csv })
  .replace(/[<>&\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const template = readFileSync(join(ROOT, 'FM27-Tactic-Builder.html'), 'utf8');
assert.equal(template.split(SLOT).length, 2, 'the page has one slot for the plugin');
const filled = join(mkdtempSync(join(tmpdir(), 'fm27tb-')), 'FM27 Tactic Builder.html');
writeFileSync(filled, template.replace(SLOT, () => SLOT.replace('>null<', `>${json}<`)));
const fromGame = await browser.newPage({ viewport: { width: 1200, height: 900 } });
fromGame.on('pageerror', (e) => problems.push(e.message));
fromGame.on('request', (r) => !/^(file|data|blob):/.test(r.url()) && external.push(r.url()));
await fromGame.goto('file://' + filled);
await fromGame.waitForSelector('#result:not(.hidden) .report', { timeout: 15000 });
assert.match(await fromGame.textContent('#src-note'), /^Read from FM27 · /);
assert.match(await fromGame.textContent('.report'), /Harbour City/);
assert.equal(await fromGame.$eval('#strength-quick', (e) => e.value), '0');
await fromGame.selectOption('#strength-quick', '2');
await fromGame.waitForFunction(() => /title favourites/.test(document.querySelector('.report .meta')?.textContent || ''), null, { timeout: 15000 });
assert.match(await fromGame.textContent('#src-note'), /^Read from FM27/, 'still the squad from the game');
await fromGame.close();
console.log('ok  page filled by the plugin opens straight on the tactic; team strength changes on the report');

await page.click('#again');
await page.setInputFiles('#file', { name: 'notes.csv', mimeType: 'text/csv', buffer: Buffer.from('Name,Club\nA,B\n') });
await page.waitForSelector('#status .error');
console.log('ok  friendly error for a file without attributes');

await browser.close();
assert.deepEqual(problems, [], 'no errors in the page');
assert.deepEqual(external, [], 'no network requests');
console.log('All browser checks passed.');
