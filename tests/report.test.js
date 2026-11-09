import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse } from '../src/analyse.js';
import { renderReport, standaloneReport } from '../src/report/render.js';
import { docs, sample, SAMPLE_FILES } from './helpers.js';

for (const file of SAMPLE_FILES) {
  test(`report for ${file} has every section`, () => {
    const result = analyse(sample(file), file, docs);
    const html = renderReport(result);
    for (const id of ['overview', 'setup', 'why', 'suitability', 'data']) assert.ok(html.includes(`id="${id}"`), id);
    assert.ok(html.includes("can't put the tactic into FM27"), 'says clearly it cannot write into the game');
    assert.equal((html.match(/<svg class="pitch"/g) || []).length, 2, 'two pitch diagrams');
    assert.equal((html.match(/class="pl /g) || []).length, 22, '11 players on each pitch');
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
  assert.ok(!/<script/i.test(doc), 'no scripts in the saved report');
});
