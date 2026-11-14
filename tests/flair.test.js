// The Floodlights extras: crest, pundit line, club colours, walk-out data, stamp markup, saved-report fonts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse } from '../src/analyse.js';
import { renderReport, standaloneReport } from '../src/report/render.js';
import { crestSVG, crestFavicon } from '../src/report/crest.js';
import { punditLine, PUNDIT_LINES } from '../src/report/pundit.js';
import { KIT_PRESETS, cleanKit, contrast, kitInk, kitStyle } from '../src/report/kit.js';
import { docs, sample } from './helpers.js';

const result = analyse(sample('squad_20261108_201500.csv'), 'squad_20261108_201500.csv', docs);

test('the crest: unique gradient ids, a favicon, no outside references', () => {
  const a = crestSVG();
  const b = crestSVG();
  const id = (s) => s.match(/linearGradient id="([^"]+)"/)[1];
  assert.notEqual(id(a), id(b), 'two crests on one page must not share a gradient id');
  assert.ok(crestFavicon().startsWith('data:image/svg+xml,'));
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(a), 'no links to the internet');
});

test('the pundit line is one of the lines, the same every time, and fits the tactic', () => {
  const line = punditLine(result);
  assert.ok(PUNDIT_LINES.includes(line));
  assert.equal(punditLine(result), line, 'same tactic, same line');
  const press = { ...result, instructions: { ...result.instructions, values: { ...result.instructions.values, lineOfEngagement: 'High Press', defensiveTransition: 'Counter-Press' } } };
  assert.match(punditLine(press), /press|chasing|ball back/i);
  const bus = { ...result, idea: null, instructions: { ...result.instructions, values: { ...result.instructions.values, lineOfEngagement: 'Low Block', attackingTransition: 'Counter-Attack' } } };
  assert.match(punditLine(bus), /ball|bus|absorb/i);
  const headers = { ...result, idea: { empty: false, understood: [{ id: 'aerial' }] } };
  assert.match(punditLine(headers), /cross|head|ball/i);
  for (const l of PUNDIT_LINES) assert.ok(!/\b(he|his|him|she|her)\b/i.test(l), `no pronouns in "${l}"`);
});

test('club colours: cleaned, readable, and applied to the report only when chosen', () => {
  assert.equal(cleanKit(null), null);
  assert.equal(cleanKit({ shirt: 'red', trim: '#fff' }), null);
  assert.deepEqual(cleanKit({ shirt: '#C8102E', trim: '#FFFFFF' }), { shirt: '#c8102e', trim: '#ffffff' });
  for (const [, shirt, trim] of KIT_PRESETS) {
    assert.ok(contrast(shirt, kitInk({ shirt, trim })) >= 4.5, `role letters readable on ${shirt}`);
  }
  assert.equal(kitInk({ shirt: '#f5d000', trim: '#ffffff' }), '#000000', 'white on yellow is unreadable, so black');
  assert.equal(kitStyle(null), '');
  assert.match(kitStyle({ shirt: '#c8102e', trim: '#ffffff' }), /--kit-1:#c8102e;--kit-2:#ffffff;--kit-ink:#ffffff/);
  assert.ok(!renderReport(result).includes('--kit-1'), 'no kit, plain tokens');
  assert.ok(renderReport(result, { kit: { shirt: '#c8102e', trim: '#ffffff' } }).includes('<article class="report" style="--kit-1:#c8102e'));
});

test('report header: crest, pundit line, locked-in stamp, walk-out data on the tokens', () => {
  const html = renderReport(result);
  assert.ok(html.includes('class="masthead"') && html.includes('class="crest"'));
  assert.ok(html.includes('class="pundit"'));
  assert.ok(html.includes('class="stamp"') && html.includes('Locked in'));
  const tokens = html.match(/<g class="pl [^"]*" tabindex="0" style="--wx:-?\d+px;--wy:-?\d+px;--wi:\d+"/g) || [];
  assert.ok(tokens.length >= 22, 'every token knows where the tunnel is');
});

test('saved report: favicon, and the fonts when the app passes them', () => {
  const page = standaloneReport(result, { fontCss: '@font-face{font-family:"TB Display"}' });
  assert.ok(page.includes('<link rel="icon" href="data:image/svg+xml,'));
  assert.ok(page.includes('@font-face{font-family:"TB Display"}'));
  assert.ok(!standaloneReport(result).includes('@font-face'), 'without fonts it falls back to system fonts');
});

test('tactic as text: shapes, every starter, changed settings and set pieces, no HTML', async () => {
  const { tacticText } = await import('../src/report/text.js');
  const text = tacticText(result);
  assert.match(text, /^Harbour City: FM27 tactic/);
  assert.ok(text.includes(`In possession: ${result.best.ipName}`));
  for (const l of result.best.lanes) assert.ok(text.includes(`- ${l.player.name}: `), l.player.name);
  for (const i of [...result.instructions.ip, ...result.instructions.oop].filter((x) => x.changed)) assert.ok(text.includes(`- ${i.name}: ${i.value}`), i.name);
  assert.match(text, /SET PIECES\n- Captain \/ vice: /);
  assert.ok(!/[<>]/.test(text), 'plain text');
});
