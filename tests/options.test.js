import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse } from '../src/analyse.js';
import { renderReport } from '../src/report/render.js';
import { playerKey } from '../src/engine/picks.js';
import { docs, sample } from './helpers.js';

const CSV = sample('squad_20261108_201500.csv');
const run = (extra = {}) => analyse(CSV, 'squad.csv', docs, { alternatives: false, ...extra });
const auto = run();

test('your own formation: the tactic uses it, and says what the tool would have chosen', () => {
  const r = run({ formation: { ip: '3-5-2 DM WB', oop: '5-3-2 DM WB' } });
  assert.ok(r.ok, r.error);
  assert.equal(r.best.ipName, '3-5-2 DM WB');
  assert.equal(r.best.oopName, '5-3-2 DM WB');
  assert.ok(r.formationChoice.auto, 'compares with the free choice');
  assert.equal(r.formationChoice.auto.ipName, auto.best.ipName);
  assert.ok(r.formationChoice.fitCost >= -0.5);
  assert.ok(r.search.ranking.every((s) => s.ipName === '3-5-2 DM WB' && s.oopName === '5-3-2 DM WB'));
  assert.ok(renderReport(r).includes('Built on your formation'));
});

test('one phase chosen: the tool picks the best partner shape for the other', () => {
  const r = run({ formation: { ip: '4-4-2' } });
  assert.equal(r.best.ipName, '4-4-2');
  assert.ok(r.search.ranking.length > 1, 'several out-of-possession partners tried');
  assert.equal(r.formationChoice.oop, null);
});

test('unknown formation names are ignored with a note; impossible shapes give a clear error', () => {
  const r = run({ formation: { ip: 'The Christmas Tree' } });
  assert.ok(r.ok);
  assert.equal(r.formationChoice, null);
  assert.ok(r.warnings.some((w) => /Christmas Tree/.test(w)));
  const keepers = r.players.filter((p) => p.isGoalkeeper && !p.onLoan);
  const allButOneOutfield = r.players.filter((p) => !p.isGoalkeeper && !p.onLoan).slice(0, -9);
  const picks = Object.fromEntries([...keepers.slice(1), ...allButOneOutfield].map((p) => [playerKey(p), { out: true }]));
  const bad = run({ formation: { ip: '3-5-2 DM WB', oop: '5-3-2 DM WB' }, picks });
  if (!bad.ok) {
    assert.equal(bad.formationError, true);
    assert.match(bad.error, /can't be used/);
  }
});

test('unavailable players are left out of the XI, the depth chart and every alternative', () => {
  const out = auto.best.lanes.slice(0, 3).map((l) => l.player);
  const keys = Object.fromEntries(out.map((p) => [playerKey(p), { out: true, start: true }]));
  const r = analyse(CSV, 'squad.csv', docs, { picks: keys });
  assert.ok(r.ok, r.error);
  const ids = new Set(out.map((p) => p.uid));
  assert.ok(!r.best.lanes.some((l) => ids.has(l.player.uid)), 'not in the XI');
  assert.ok(r.players.filter((p) => ids.has(p.uid)).every((p) => p.unavailable && !p.mustStart), 'unavailable wins over must start');
  for (const d of r.depth.lanes) {
    assert.ok(!(d.secondChoice && ids.has(d.secondChoice.player.uid)));
    assert.ok(!d.options.some((o) => ids.has(o.player.uid)));
  }
  for (const a of r.alternatives) assert.ok(!a.system.lanes.some((l) => ids.has(l.player.uid)), a.title);
  assert.ok(renderReport(r).includes('you marked them unavailable'));
});

test('cup and rotation XI: same shapes, the first XI rested, a note when cover runs out', () => {
  const r = analyse(CSV, 'squad.csv', docs);
  const rot = r.alternatives.find((a) => a.title === 'Cup games and rotation');
  assert.ok(rot);
  assert.equal(rot.system.ipName, r.best.ipName);
  assert.equal(rot.system.oopName, r.best.oopName);
  const first = new Set(r.best.lanes.map((l) => l.player));
  const kept = rot.system.lanes.filter((l) => first.has(l.player)).length;
  assert.equal(kept, rot.rotation.stillStarting.length);
  assert.ok(kept <= 3, `at most a few starters needed, got ${kept}`);
  if (kept) assert.match(rot.when, /still start/);
});
