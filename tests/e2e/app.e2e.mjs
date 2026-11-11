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
  assert.deepEqual(sections, ['overview', 'setup', 'why', 'depth', 'alternatives', 'match', 'training', 'suitability', 'data'], file);
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
assert.equal(await page.$$eval('#secnav a', (as) => as.length), 9);
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
await page.locator('.pk-row', { hasText: 'Sami Pemberton' }).locator('.switch:not(.out)').click();
await page.click('#pk-apply');
await page.waitForFunction(() => document.querySelector('.report')?.textContent.includes('Built around your picks'), null, { timeout: 30000 });
const overviewText = await page.textContent('#overview');
assert.ok(overviewText.includes('Lindqvist') && overviewText.includes('Pemberton'), 'picked players start');
assert.equal(await page.textContent('#picks-badge'), '2');
console.log('ok  choose players: marquee + must start rebuild the tactic');
await page.click('#choose-players');
await page.locator('.pk-row', { hasText: 'Callum Ashdown' }).locator('.switch:not(.out)').click();
await page.locator('.pk-row', { hasText: 'Rafael Holloway' }).locator('.switch:not(.out)').click();
assert.ok(await page.isDisabled('#pk-apply'), 'two goalkeepers cannot be applied');
await page.click('#pk-clear');
await page.click('#pk-apply');
await page.waitForFunction(() => !document.querySelector('.report').textContent.includes('Built around your picks'), null, { timeout: 30000 });
console.log('ok  picks validated and cleared');

// Checklist mode: ticks show progress and survive a reload of the same tactic
await page.click('#secnav a[data-id="setup"]');
const ticks = page.locator('#setup .tick input');
await ticks.nth(0).check();
await ticks.nth(1).check();
assert.equal(await page.textContent('#cb-done'), '2');
await page.reload();
await page.click('#sample');
await page.waitForSelector('#result:not(.hidden) .report');
assert.equal(await page.textContent('#cb-done'), '2', 'ticks remembered for this tactic');
await page.evaluate(() => { for (const b of document.querySelectorAll('#setup .tick input')) if (!b.checked) b.click(); });
assert.ok(await page.$eval('#setup', (e) => e.classList.contains('locked')), 'every box ticked: locked in');
assert.ok(await page.isVisible('#setup .stamp'), 'the "Locked in" stamp shows');
assert.match(await page.textContent('#checkbar'), /tactic locked in/);
await page.click('#cb-clear');
assert.equal(await page.textContent('#cb-done'), '0');
assert.ok(!(await page.isVisible('#setup .stamp')), 'stamp gone after clearing');
console.log('ok  checklist mode, locked-in stamp');

// Floodlights look: embedded fonts load (no internet), crest favicon, pundit line, players walk out
await page.evaluate(() => document.fonts.ready);
const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')));
for (const f of ['TB Display', 'TB Numbers', 'TB Scoreboard']) assert.ok(fonts.includes(f), `font ${f} loaded`);
assert.match(await page.getAttribute('link[rel="icon"]', 'href'), /^data:image\/svg\+xml,/);
assert.ok((await page.textContent('.report .pundit q')).length > 10, 'the pundit has something to say');
assert.match(await page.getAttribute('#overview .pl >> nth=0', 'style'), /--wx:/);
console.log('ok  fonts, crest, pundit line, walk-out data');

// Club colours: pick a kit, the tokens wear it, remembered after a reload; plain tokens again
await page.click('#kit-menu > summary');
await page.click('.kit-presets button[title="Yellow and black"]');
const kitVars = () => page.$eval('#report-holder .report', (e) => [e.style.getPropertyValue('--kit-1'), e.style.getPropertyValue('--kit-ink')]);
assert.deepEqual(await kitVars(), ['#f5d000', '#151515']);
assert.equal(await page.$eval('#overview .pl .dot', (e) => getComputedStyle(e).fill), 'rgb(245, 208, 0)');
await page.reload();
await page.click('#sample');
await page.waitForSelector('#result:not(.hidden) .report');
assert.deepEqual(await kitVars(), ['#f5d000', '#151515'], 'kit remembered for this club');
await page.click('#kit-menu > summary');
await page.click('#kit-reset');
assert.deepEqual(await kitVars(), ['', '']);
await page.click('#report-holder h1');
assert.ok(!(await page.$eval('#kit-menu', (e) => e.open)), 'menu closes on a click elsewhere');
console.log('ok  club colours');

// Player card from the pitch
await page.click('#overview .pl[data-pid] >> nth=0');
await page.waitForSelector('#pcard[open] .pcard');
assert.match(await page.textContent('#pcard .pcard'), /In this tactic/);
await page.click('#pcard-close');
console.log('ok  player card');

// Role suitability filter
await page.click('#secnav a[data-id="suitability"]');
await page.fill('#sf-q', 'lindq');
assert.match(await page.textContent('#sf-count'), /^1 of \d+ players$/);
await page.fill('#sf-q', '');
console.log('ok  role suitability filter');

// Match plan: the plan follows what you pick about the opponent
await page.click('#secnav a[data-id="match"]');
await page.click('#mp-controls label:has(input[value="muchStronger"])');
await page.click('#mp-controls label:has(input[value="away"])');
await page.click('#mp-controls label:has(input[value="pressHigh"])');
assert.match(await page.textContent('#mp-out'), /Away against stronger teams/);
await page.click('#mp-clear');
assert.match(await page.textContent('#mp-out'), /Pick what your next opponent is like/);
console.log('ok  match plan');

// Formation: your own shape, then back to the tool's choice
await page.click('#formation-btn');
await page.selectOption('#fm-ip', '4-4-2');
await page.selectOption('#fm-oop', '4-4-2');
await page.click('#fm-apply');
await page.waitForFunction(() => document.querySelector('#overview')?.textContent.includes('Built on your formation'), null, { timeout: 30000 });
assert.ok(!(await page.isHidden('#formation-badge')), 'badge shows your formation is in use');
await page.click('#formation-btn');
await page.click('#fm-auto');
await page.waitForFunction(() => !document.querySelector('#overview')?.textContent.includes('Built on your formation'), null, { timeout: 30000 });
console.log('ok  formation: your own and back to auto');

// Unavailable players are left out
await page.click('#choose-players');
const firstStarter = (await page.$eval('#overview .pl[data-pid] title', (t) => t.textContent)).split(' · ')[0];
await page.locator('.pk-row', { hasText: firstStarter }).locator('.switch.out').click();
await page.click('#pk-apply');
await page.waitForFunction((n) => document.querySelector('#overview')?.textContent.includes('marked them unavailable'), firstStarter, { timeout: 30000 });
await page.click('#choose-players');
await page.click('#pk-clear');
await page.click('#pk-apply');
await page.waitForFunction(() => !document.querySelector('#overview')?.textContent.includes('marked them unavailable'), null, { timeout: 30000 });
console.log('ok  unavailable players');

// Your idea: an example, built at Extreme, then cleared
await page.click('#idea-btn');
await page.waitForSelector('#idea-panel:not(.hidden) .id-chip');
await page.locator('.id-chip').first().click();
assert.match(await page.textContent('#id-understood'), /Headed goals/);
await page.locator('#id-k').fill('3');
await page.click('#id-apply');
await page.waitForSelector('#overview .idea-box', { timeout: 30000 });
assert.match(await page.textContent('#overview .idea-box'), /Your idea · Extreme/);
assert.ok(!(await page.isHidden('#idea-badge')));
assert.match(await page.textContent('#setup'), /Your idea \(headed goals\)/);
await page.click('#idea-btn');
await page.click('#id-clear');
await page.waitForFunction(() => !document.querySelector('#overview .idea-box'), null, { timeout: 30000 });
console.log('ok  your idea: understood, built at Extreme, cleared');

// Cheat sheet and image
assert.ok(await page.$('#sheet-holder .sheet'), 'cheat sheet ready to print');
const [png] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu > summary').then(() => page.click('#share-image'))]);
assert.match(png.suggestedFilename(), /^FM27 tactic - Harbour City\.png$/);
console.log('ok  cheat sheet ready, image saved');

const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu > summary').then(() => page.click('#save'))]);
assert.match(download.suggestedFilename(), /^FM27 tactic - Harbour City - \d{4}-\d{2}-\d{2}\.html$/);
const saved = readFileSync(await download.path(), 'utf8');
assert.ok(saved.includes('@font-face') && saved.includes('font-family:"TB Display"'), 'saved report keeps the fonts');
console.log('ok  save report');

// Opened by the FM27 plugin (F8): the squad sits in the page's slot and the tactic appears without a click.
// Same filling as plugin/src/FM27TacticBuilder.Core/TacticPage.cs (JSON with <, > and & escaped).
const SLOT = '<script type="application/json" id="fm27tb-export">null</script>';
const csv = readFileSync(join(ROOT, 'samples', 'squad_20261108_201500.csv'), 'utf8');
const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/);
const head = lines[0];
const older = lines.map((l, i) => (i && l ? l.replace(/(^|,)(1[0-8])(,|$)/, (m, a, v, b) => `${a}${Number(v) - 2}${b}`) : l)).join('\n');
const shortlist = [head, ...lines.slice(1, 8).map((l, i) => l.replace(/^\d+,/, `990${i},`).replace(/,Harbour City,/, ',Other FC,'))].join('\n');
const json = JSON.stringify({
  name: 'squad_20261110_180852.csv', exportedAt: '2026-11-10T18:08:52', source: 'Football Manager 27', text: csv,
  scouting: { name: 'shortlist_20261111_100000.csv', exportedAt: '2026-11-11T10:00:00', text: shortlist },
  history: [{ name: 'squad_20261001_120000.csv', exportedAt: null, text: older }],
})
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
assert.ok(await fromGame.$('#scouting'), 'shortlist compared');
assert.match(await fromGame.textContent('#depth'), /players scored in this tactic's positions and roles/);
assert.match(await fromGame.textContent('#training'), /Progress since 1 Oct 2026/);
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
