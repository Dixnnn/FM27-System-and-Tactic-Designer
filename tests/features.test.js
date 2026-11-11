import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse, readPlayers } from '../src/analyse.js';
import { matchPlan } from '../src/engine/matchPlan.js';
import { recruitment } from '../src/engine/recruitment.js';
import { progress, dateFromName } from '../src/engine/progress.js';
import { playerCard } from '../src/report/card.js';
import { cheatSheet } from '../src/report/sheet.js';
import { renderReport } from '../src/report/render.js';
import { docs, sample } from './helpers.js';

const CSV = sample('squad_20261108_201500.csv');
const result = analyse(CSV, 'squad_20261108_201500.csv', docs);
const lines = CSV.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);

/** The same file with other ids and names: players from somewhere else. */
const asOthers = (rows) => [lines[0], ...rows.map((l, i) => l.replace(/^\d+,/, `880${i},`).replace(/(,"?)([A-Z][a-z]+ [A-Z][a-z]+)/, '$1Scout $2'))].join('\n');

test('match plan: much stronger opponents away -> start from the away setup', () => {
  const p = matchPlan(result, { strength: 'muchStronger', venue: 'away' });
  assert.equal(p.base.title, 'Away against stronger teams');
  assert.equal(p.mentality.value, p.base.alt.instructions.mentality.value);
});

test('match plan: every change is a real option of that instruction, with a reason', () => {
  const all = { strength: 'similar', style: ['pressHigh', 'sitDeep', 'longBalls', 'counter', 'playOut', 'possession', 'crosses'], players: ['fastForwards', 'tallStriker', 'fastWingers', 'weakAir', 'slowCBs'] };
  const p = matchPlan(result, all);
  const items = Object.fromEntries([...result.instructions.ip, ...result.instructions.oop].map((i) => [i.id, i]));
  for (const c of p.changes) {
    assert.ok(items[c.id].options.includes(c.to), `${c.name}: ${c.to}`);
    assert.notEqual(c.from, c.to);
    assert.ok(c.reason.length > 10);
  }
  assert.ok(p.changes.length + p.notes.length > 3);
});

test('match plan: nothing chosen -> empty plan; a slightly weaker side at home -> one step more positive', () => {
  assert.equal(matchPlan(result, {}).empty, true);
  const p = matchPlan(result, { strength: 'weaker' });
  const order = docs.instructions.mentalities;
  assert.equal(order.indexOf(p.mentality.value), order.indexOf(result.instructions.mentality.value) + 1);
});

test('recruitment: better players from elsewhere would start; your own players are skipped', () => {
  const shortlist = asOthers(lines.slice(1, 12));
  const candidates = readPlayers(shortlist, 'shortlist.csv', docs).players;
  const ownPlayers = readPlayers([lines[0], ...lines.slice(1, 4)].join('\n'), 'own.csv', docs).players;
  const r = recruitment(result, [...candidates, ...ownPlayers]);
  assert.equal(r.inSquad, 3, 'players already at the club are skipped');
  assert.equal(r.considered, candidates.length);
  for (const row of r.rows) {
    assert.ok(['starts', 'cover', 'no'].includes(row.verdict));
    assert.ok(Math.abs(row.gain - (row.value - row.lane.value)) < 1e-9);
  }
  for (const row of r.rows) {
    if (row.verdict === 'starts') assert.ok(row.gain > 1);
    else if (row.verdict === 'cover') assert.ok(row.gain <= 1 && row.coverGain > 1);
  }
});

test('recruitment: a clearly better version of a starter would start in his spot', () => {
  const starter = result.best.lanes.find((l) => !l.player.isGoalkeeper).player;
  const line = lines.find((l) => l.startsWith(`${starter.uid},`));
  const head = lines[0].split(',');
  const attrCols = new Set(docs.columns.attributes.flatMap((a) => a.headers));
  // +3 on every attribute (CSV fields here have no commas inside attribute values)
  const cells = line.match(/("[^"]*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, ''));
  const better = cells.map((c, i) => (attrCols.has(head[i]) && /^\d+$/.test(c) ? String(Math.min(20, Number(c) + 3)) : c));
  better[0] = '8899';
  better[head.indexOf('Player')] = 'Scout Better';
  const cand = readPlayers([lines[0], better.join(',')].join('\n'), 'better.csv', docs).players;
  const r = recruitment(result, cand);
  assert.equal(r.rows[0].verdict, 'starts');
  assert.ok(r.rows[0].gain > 3, `gain ${r.rows[0].gain}`);
});

test('recruitment via analyse(): the report shows who would improve the team', () => {
  const r = analyse(CSV, 'squad.csv', docs, { alternatives: false, scouting: { name: 'shortlist_x.csv', text: asOthers(lines.slice(1, 10)) } });
  assert.ok(r.scouting.considered > 0);
  const html = renderReport(r);
  assert.ok(html.includes('id="scouting"'));
  assert.match(html, /players scored in this tactic's positions and roles/);
});

test('progress: attribute gains since an older export, the trend and arrivals', () => {
  const older = [lines[0], ...lines.slice(2).map((l, i) => (i % 2 ? l : l.replace(/,(1[0-8]),/, (m, v) => `,${Number(v) - 2},`)))].join('\n');
  const r = analyse(CSV, 'squad_20261108_201500.csv', docs, { alternatives: false, history: [{ name: 'squad_20261001_120000.csv', text: older }] });
  const pr = r.progress;
  assert.ok(pr.ok);
  assert.equal(pr.trend.length, 2);
  assert.ok(pr.trend[1].level >= pr.trend[0].level);
  assert.ok(pr.improvers.length > 0);
  assert.ok(pr.improvers.every((x) => x.changes.some((c) => c.delta > 0)));
  assert.equal(pr.arrivals.length, 1, 'the player missing from the old export arrived since');
  assert.match(renderReport(r), /Progress since 1 Oct 2026/);
});

test('progress: exports of another club or newer than this one are ignored', () => {
  const other = lines.map((l, i) => (i ? l.replace(/Harbour City/g, 'Rival Town') : l)).join('\n');
  const r = analyse(CSV, 'squad_20261108_201500.csv', docs, { alternatives: false, history: [{ name: 'squad_20261001_120000.csv', text: other }, { name: 'squad_20261201_120000.csv', text: CSV }] });
  assert.equal(r.progress.ok, false);
  assert.deepEqual(dateFromName('squad_20261110_180852.csv'), new Date(2026, 10, 10, 18, 8, 52));
});

test('player card: place in the tactic, attributes of his roles, best roles; also for a bench player', () => {
  const starter = result.best.lanes[0].player;
  const html = playerCard(result, starter);
  assert.match(html, /In this tactic/);
  assert.match(html, /Attributes for these roles/);
  assert.match(html, /His best roles anywhere/);
  const bench = result.players.find((p) => !p.onLoan && !result.best.lanes.some((l) => l.player === p));
  assert.match(playerCard(result, bench), /Not in the starting XI/);
});

test('cheat sheet: both shapes, only the changed settings, set pieces', () => {
  const html = cheatSheet(result);
  assert.equal((html.match(/<svg class="pitch"/g) || []).length, 2);
  const changed = [...result.instructions.ip, ...result.instructions.oop].filter((i) => i.changed);
  for (const i of changed) assert.ok(html.includes(i.name), i.name);
  const unchanged = [...result.instructions.ip, ...result.instructions.oop].filter((i) => !i.changed);
  assert.ok(unchanged.every((i) => !html.includes(`<td>${i.name}</td>`)), 'defaults are left out');
  assert.match(html, /Corners left \/ right/);
});

test('checklist: every changed setting and every player has a tick box', () => {
  const html = renderReport(result);
  const setup = html.slice(html.indexOf('id="setup"'), html.indexOf('id="why"'));
  const changed = [...result.instructions.ip, ...result.instructions.oop].filter((i) => i.changed);
  for (const i of changed) assert.ok(setup.includes(`data-k="ti:${i.id}"`), i.id);
  for (const l of result.best.lanes) assert.ok(setup.includes(`data-k="role:${l.player.id}"`));
});
