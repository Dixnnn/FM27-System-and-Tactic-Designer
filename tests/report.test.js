import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse } from '../src/analyse.js';
import { renderReport, standaloneReport } from '../src/report/render.js';
import { docs, sample, SAMPLE_FILES } from './helpers.js';

for (const file of SAMPLE_FILES) {
  test(`report for ${file} has every section`, () => {
    const result = analyse(sample(file), file, docs);
    const html = renderReport(result);
    for (const id of ['overview', 'setup', 'why', 'depth', 'alternatives', 'training', 'suitability', 'data']) assert.ok(html.includes(`id="${id}"`), id);
    assert.ok(html.includes("can't put the tactic into FM27"), 'says clearly it cannot write into the game');
    const overview = html.slice(html.indexOf('id="overview"'), html.indexOf('id="setup"'));
    assert.equal((overview.match(/<svg class="pitch"/g) || []).length, 2, 'two pitch diagrams for the main tactic');
    assert.equal((overview.match(/class="pl /g) || []).length, 22, '11 players on each pitch');
    const steps = ['Style and mentality', 'Formations, players and roles', 'Team Instructions › In Possession', 'Team Instructions › Out of Possession', 'Player instructions', 'Set pieces and captain'];
    steps.forEach((h, i) => assert.ok(html.includes(`<span class="step">${i + 1}</span>${h}`), h));
  });
}

test('missing columns appear in the report with where to add them', () => {
  const html = renderReport(analyse(sample('missing-columns.csv'), 'missing-columns.csv', docs));
  assert.ok(html.includes('Work Rate'));
  assert.ok(html.includes('Insert Column › Attributes &gt; Mental &gt; Work Rate'));
});

test('player names are escaped (no HTML injection from a file)', () => {
  const csv = sample('squad_20261108_201500.csv').replace('Callum Ashdown', '<img src=x onerror=alert(1)>');
  const html = renderReport(analyse(csv, 'evil.csv', docs));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('saved report is a complete HTML document with its styles', () => {
  const doc = standaloneReport(analyse(sample('squad_20261108_201500.csv'), 'squad.csv', docs));
  assert.match(doc, /^<!doctype html>/);
  assert.ok(doc.includes('<style>'));
  assert.match(doc, /<html lang="en" data-theme="dark">/, 'dark by default');
  assert.ok(doc.includes('@media print { :root:root {'), 'prints in the light theme');
  assert.match(standaloneReport(analyse(sample('squad_20261108_201500.csv'), 'squad.csv', docs), { theme: 'light' }), /data-theme="light"/);
  assert.ok(!/<script/i.test(doc), 'no scripts in the saved report');
});
