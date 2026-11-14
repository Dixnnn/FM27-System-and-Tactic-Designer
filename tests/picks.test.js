import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse } from '../src/analyse.js';
import { renderReport } from '../src/report/render.js';
import { applyPicks, checkPicks, playerKey } from '../src/engine/picks.js';
import { docs, sample } from './helpers.js';

const CSV = sample('squad_20261108_201500.csv');
// Sample squad ids (fictional players)
const ID = {
  ashdown: '91000000', holloway: '91000137', lindqvist: '91003151', everly: '91003014', pemberton: '91002055',
  garrow: '91002466', whitlock: '91002192', castell: '91003562', ambrose: '91003425',
};
const run = (picks, extra = {}) => analyse(CSV, 'squad.csv', docs, { picks, ...extra });
const xiOf = (r) => new Set(r.best.lanes.map((l) => l.player.uid));

test('applyPicks: keys by Unique ID, marquee implies must start, loaned players are ignored', () => {
  const players = [
    { uid: '1', name: 'A', onLoan: false },
    { uid: '2', name: 'B', onLoan: false },
    { uid: '', name: 'C', onLoan: true, club: 'Elsewhere' },
  ];
  const { ignored } = applyPicks(players, { 1: { label: 'marquee' }, 2: { start: true, label: 'future' }, C: { start: true } });
  assert.deepEqual([players[0].mustStart, players[0].label], [true, 'marquee']);
  assert.deepEqual([players[1].mustStart, players[1].label], [true, 'future']);
  assert.equal(players[2].mustStart, false);
  assert.equal(ignored.length, 1);
  assert.match(ignored[0].reason, /on loan at Elsewhere/);
  assert.equal(playerKey(players[2]), 'C');
});

test('checkPicks: more than 11, or two goalkeepers', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ name: `P${i}`, mustStart: true, isGoalkeeper: false }));
  assert.match(checkPicks(many)[0], /12 players/);
  assert.match(checkPicks([{ name: 'G1', mustStart: true, isGoalkeeper: true }, { name: 'G2', mustStart: true, isGoalkeeper: true }])[0], /goalkeepers/);
});

test('must-start players always start, and the tactic is rebuilt around them', () => {
  const r = run({ [ID.lindqvist]: { start: true }, [ID.pemberton]: { start: true }, [ID.garrow]: { start: true } }, { alternatives: false });
  assert.ok(r.ok, r.error);
  const xi = xiOf(r);
  for (const id of [ID.lindqvist, ID.pemberton, ID.garrow]) assert.ok(xi.has(id), id);
  assert.ok(r.best.lanes.every((l) => !l.forbidden), 'everyone in a position he can play');
  assert.ok(r.freeChoice, 'compares with the free choice');
  assert.ok(r.freeChoice.fitCost >= -0.5, 'picks never make the team much stronger than the free choice');
  assert.equal(r.picks.summary.length, 3);
});

test('an injured player marked to start is still picked', () => {
  const r = run({ [ID.everly]: { start: true } }, { alternatives: false });
  assert.ok(xiOf(r).has(ID.everly));
  assert.ok(r.players.find((p) => p.uid === ID.everly).injured);
});

test('marquee players: always start, extra weight, and the shape follows them', () => {
  const r = run({ [ID.lindqvist]: { label: 'marquee' }, [ID.everly]: { label: 'marquee' } });
  assert.ok(r.ok, r.error);
  const xi = xiOf(r);
  assert.ok(xi.has(ID.lindqvist) && xi.has(ID.everly));
  const strikers = r.best.ipSlots.filter((s) => s.startsWith('ST')).length;
  assert.ok(strikers >= 2, `two marquee strikers need a two-striker shape, got ${r.best.ipName}`);
  assert.ok(r.best.picks > 0, 'the marquee weight counts in the system score');
  // every alternative keeps the marquee players (except the rotation XI, which rests the first XI on purpose)
  for (const a of r.alternatives.filter((x) => !x.rotation)) {
    const ids = new Set(a.system.lanes.map((l) => l.player.uid));
    assert.ok(ids.has(ID.lindqvist) && ids.has(ID.everly), a.title);
  }
  const html = renderReport(r);
  assert.ok(html.includes('Built around your picks'));
  assert.ok(html.includes('class="mk-marquee"'), 'marquee marker on the pitch');
});

test('a quick marquee striker shapes the team instructions', () => {
  const r = run({ [ID.everly]: { label: 'marquee' } }, { alternatives: false });
  const everly = r.players.find((p) => p.uid === ID.everly);
  const quick = (everly.attrs.Pace.v + everly.attrs.Acceleration.v) / 2 >= r.profile.level + 2;
  if (quick) {
    assert.equal(r.instructions.values.passReception, 'Pass Into Space');
    assert.match(r.instructions.ip.find((i) => i.id === 'passReception').reason, /^Built around Everly/);
  }
  assert.ok(Array.isArray(r.instructions.builtAround));
});

test('future stars: development plan, priority as cover, and a development XI alternative', () => {
  const r = run({ [ID.whitlock]: { label: 'future' } });
  assert.ok(r.ok, r.error);
  const plan = r.picks.futureStars.find((f) => f.player.uid === ID.whitlock);
  assert.ok(plan, 'has a plan');
  assert.ok(plan.minutes.length > 10);
  assert.ok(plan.train.length > 0);
  assert.ok(plan.train.every((t) => !['Aggression', 'Bravery', 'Determination', 'Flair', 'Leadership'].includes(t.attr)));
  if (!plan.starting) {
    const dev = r.alternatives.find((a) => a.title === 'With your future stars starting');
    assert.ok(dev, 'development XI alternative');
    assert.ok(dev.system.lanes.some((l) => l.player.uid === ID.whitlock));
  }
  const html = renderReport(r);
  assert.ok(html.includes('Developing your future stars'));
  assert.match(html, /potential \d\.\d stars/, "shows FM's potential stars from the export");
});

test('a future star only wins close calls: a much weaker one does not start', () => {
  const r = run({ [ID.ambrose]: { label: 'future' } }, { alternatives: false });
  const free = run({}, { alternatives: false });
  assert.ok(Math.abs(r.best.fit - free.best.fit) < 1.5, 'team strength barely changes');
});

test('impossible picks give a clear error; loaned picks are ignored', () => {
  const twoKeepers = run({ [ID.ashdown]: { start: true }, [ID.holloway]: { start: true } }, { alternatives: false });
  assert.equal(twoKeepers.ok, false);
  assert.equal(twoKeepers.pickError, true);
  assert.match(twoKeepers.error, /goalkeepers/);
  const loan = run({ [ID.castell]: { start: true } }, { alternatives: false });
  assert.ok(loan.ok);
  assert.ok(!xiOf(loan).has(ID.castell));
  assert.equal(loan.picks.ignored.length, 1);
  assert.ok(renderReport(loan).includes('was ignored'));
});

test('without picks the report invites you to choose players', () => {
  const r = run({}, { alternatives: false });
  assert.equal(r.freeChoice, null);
  assert.ok(renderReport(r).includes('Choose players'));
});

test('picks can be given as a function of the club (as the app does)', () => {
  const r = run((club) => (club === 'Harbour City' ? { [ID.lindqvist]: { start: true } } : {}), { alternatives: false });
  assert.ok(xiOf(r).has(ID.lindqvist));
});
