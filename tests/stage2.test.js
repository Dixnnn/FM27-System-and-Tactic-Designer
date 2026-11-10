import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse } from '../src/analyse.js';
import { decideInstructions, derivePlan } from '../src/engine/instructions.js';
import { METRICS } from '../src/engine/profile.js';
import { evaluatePlan, oopRows } from '../src/engine/balance.js';
import { docs, sample } from './helpers.js';

// One full analysis of the sample squad, shared by the tests below.
const result = analyse(sample('squad_20261108_201500.csv'), 'squad_20261108_201500.csv', docs);

/** A profile where every area sits at the team level, then the given deltas applied. */
function profileWith(deltas = {}, extra = {}) {
  const level = 12;
  const metrics = {};
  for (const [key, label] of METRICS) {
    const delta = deltas[key] ?? 0;
    metrics[key] = { key, label, value: level + delta, delta, players: ['A Player'], attrs: [] };
  }
  return { level, metrics, groups: { strikers: [] }, cbHeight: 185, strikerHeight: 182, youngShare: 0.2, ...extra };
}

const decide = (deltas, strength = 0, extra) => decideInstructions(profileWith(deltas, extra), result.best, result.ctx, { strength });

// ---------- team instructions ----------

test('every setting is one of the options FM27 offers, in screen order', () => {
  const ins = result.instructions;
  assert.deepEqual(ins.ip.map((i) => i.id), docs.instructions.inPossession.map((i) => i.id));
  assert.deepEqual(ins.oop.map((i) => i.id), docs.instructions.outOfPossession.map((i) => i.id));
  for (const i of [...ins.ip, ...ins.oop]) {
    assert.ok(i.options.includes(i.value), `${i.name}: ${i.value}`);
    assert.ok(i.reason.length > 10, `${i.name} has a reason`);
  }
  assert.ok(docs.instructions.mentalities.includes(ins.mentality.value));
  assert.ok(ins.style.value === null || docs.instructions.styles.includes(ins.style.value));
});

test('slow centre-backs mean a deeper line and dropping off', () => {
  const ins = decide({ cbPace: -3 });
  assert.equal(ins.values.defensiveLine, 'Much Lower');
  assert.equal(ins.values.defensiveLineBehaviour, 'Drop Off More');
  assert.match(ins.oop.find((i) => i.id === 'defensiveLine').reason, /3\.0 below/);
});

test('quick centre-backs who read the game allow a higher line and stepping up', () => {
  const ins = decide({ cbPace: 2, cbReading: 1.5 });
  assert.match(ins.values.defensiveLine, /Higher/);
  assert.equal(ins.values.defensiveLineBehaviour, 'Step Up More');
});

test('a hard-working, fit squad presses high, more often, and counter-presses', () => {
  const ins = decide({ pressing: 2.2, stamina: 1, cbPace: 0.5 });
  assert.equal(ins.values.lineOfEngagement, 'High Press');
  assert.match(ins.values.triggerPress, /More Often/);
  assert.equal(ins.values.defensiveTransition, 'Counter-Press');
  assert.equal(ins.values.preventShortGkDistribution, 'Yes');
});

test('pressing high in front of slow centre-backs is moved to a mid block', () => {
  const ins = decide({ pressing: 2.2, stamina: 1, cbPace: -3 });
  assert.equal(ins.values.lineOfEngagement, 'Mid Block');
  assert.match(ins.oop.find((i) => i.id === 'lineOfEngagement').reason, /mid block/);
});

test('poor stamina tones the pressing down', () => {
  assert.equal(decide({ pressing: 1.3, stamina: -1.5 }).values.triggerPress, 'Standard');
});

test('underdogs sit in a low block with a careful mentality; favourites go forward', () => {
  const under = decide({ pressing: -0.5 }, -2);
  assert.equal(under.values.lineOfEngagement, 'Low Block');
  assert.ok(['Defensive', 'Cautious'].includes(under.mentality.value));
  assert.equal(under.values.defensiveTransition, 'Regroup');
  const fav = decide({ pressing: 0.5, finishing: 1.5, technique: 1.5, creativity: 1.5 }, 2);
  assert.equal(fav.mentality.value, 'Attacking');
});

test('good ball-players at the back play through the press; poor ones bypass it', () => {
  const good = decide({ buildUp: 2 });
  assert.equal(good.values.buildUpStrategy, 'Play Through Press');
  assert.equal(good.values.goalKicks, 'Short');
  const poor = decide({ buildUp: -2, aerialAttack: 1.5 });
  assert.equal(poor.values.buildUpStrategy, 'Bypass Press');
  assert.equal(poor.values.goalKicks, 'Long');
});

test('technical sides pass shorter; long shots and dribbling follow the attributes', () => {
  const ins = decide({ passing: 2, technique: 2, composure: 2, longShots: -2, dribbling: 2 });
  assert.match(ins.values.passingDirectness, /Shorter/);
  assert.equal(ins.values.shotsFromDistance, 'Discourage');
  assert.equal(ins.values.dribbling, 'Encourage');
});

test('centre-backs strong in the air invite crosses; weak ones stop them', () => {
  assert.equal(decide({ cbAerial: 2 }, 0, { cbHeight: 192 }).values.crossEngagement, 'Invite Crosses');
  assert.equal(decide({ cbAerial: -2 }, 0, { cbHeight: 178 }).values.crossEngagement, 'Stop Crosses');
});

test('the game plan changes the shapes chosen: a low block prefers a midfield line of four or more', () => {
  const plan = derivePlan(profileWith({ pressing: -2 }), -2, docs.tuning.instructions);
  assert.equal(plan.lineOfEngagement, 'Low Block');
  const r = analyse(sample('squad_20261108_201500.csv'), 'squad.csv', docs, { strength: -2, alternatives: false });
  assert.equal(r.instructions.values.lineOfEngagement, 'Low Block');
  assert.ok(oopRows(r.best.lanes, docs.formations.slots).mid >= 4, `${r.best.oopName} should have a midfield line of 4+`);
  const pts = evaluatePlan(r.best.lanes, docs.formations.slots, { lineOfEngagement: 'Low Block' }, docs.tuning.plan);
  assert.ok(pts.points > 0);
});

// ---------- player instructions, depth, set pieces, captain, training, alternatives ----------

test('player instructions use known names and give reasons', () => {
  const known = new Set([...docs.instructions.playerInstructions.inPossession, ...docs.instructions.playerInstructions.outOfPossession, 'Note']);
  for (const x of result.playerInstructions) {
    assert.ok(x.items.length <= 4);
    for (const i of x.items) {
      assert.ok(known.has(i.name), i.name);
      assert.ok(i.reason.length > 5);
    }
  }
  assert.ok(!result.playerInstructions.some((x) => x.lane.ip === 'GK'), 'no player instructions for the goalkeeper');
});

test('depth chart: second choices are different players, not starters, not out on loan', () => {
  const xi = new Set(result.best.lanes.map((l) => l.player));
  const seconds = result.depth.lanes.map((d) => d.secondChoice?.player).filter(Boolean);
  assert.equal(new Set(seconds).size, seconds.length, 'nobody is second choice twice');
  for (const p of seconds) {
    assert.ok(!xi.has(p), `${p.name} already starts`);
    assert.ok(!p.onLoan && !p.injured, `${p.name} must be fit and at the club`);
  }
  for (const d of result.depth.lanes) {
    for (const o of d.options) assert.ok(!o.player.onLoan);
    for (const o of d.loanOptions) assert.ok(o.player.onLoan);
  }
  for (const w of result.depth.weakAreas) {
    assert.ok(w.reasons.length);
    assert.ok(w.lookFor.length);
  }
});

test('set-piece takers, aerial targets and captains come from the starting XI', () => {
  const xi = new Set(result.best.lanes.map((l) => l.player));
  const sp = result.setPieces;
  for (const t of [sp.cornersLeft, sp.cornersRight, sp.directFreeKicks, sp.indirectFreeKicks, ...sp.penalties, ...sp.stayBack]) {
    assert.ok(t && xi.has(t.player), t?.name);
  }
  assert.ok(sp.penalties.every((t) => t.player !== sp.goalkeeper));
  assert.equal(sp.aerialTargets.length, 4);
  assert.ok(xi.has(result.captain.captain.player) && xi.has(result.captain.vice.player));
  assert.notEqual(result.captain.captain.player, result.captain.vice.player);
  assert.match(result.captain.captain.why, /Leadership/);
});

test('training: sessions are real FM27 session names; no hard-to-train attributes', () => {
  const names = new Set([...docs.instructions.training.tacticalUnderstanding, ...docs.instructions.training.matchPreparation]);
  for (const t of [...result.training.team, ...result.training.prep]) assert.ok(names.has(t.session), t.session);
  for (const x of result.training.individual) {
    for (const w of x.weakest) assert.ok(!['Aggression', 'Bravery', 'Determination', 'Flair', 'Leadership'].includes(w.attr));
  }
});

test('alternatives: an away setup, a home setup and a different shape', () => {
  const [away, home, other] = result.alternatives;
  assert.equal(result.alternatives.length, 3);
  const order = docs.instructions.mentalities;
  assert.ok(order.indexOf(away.instructions.mentality.value) < order.indexOf(result.instructions.mentality.value), 'away is more careful');
  assert.ok(order.indexOf(home.instructions.mentality.value) > order.indexOf(result.instructions.mentality.value), 'home is more attacking');
  assert.equal(away.instructions.values.lineOfEngagement, 'Low Block');
  assert.notEqual(`${other.system.ipName}`, `${result.best.ipName}`);
  for (const a of result.alternatives) {
    assert.equal(a.system.lanes.length, 11);
    assert.ok(a.system.lanes.every((l) => !l.player.onLoan));
    for (const d of a.diffs) assert.notEqual(d.from, d.to);
  }
});

test('loaned-out players are recognised from the club column and "Out On Loan"', () => {
  const loaned = result.players.filter((p) => p.onLoan).map((p) => p.club).sort();
  assert.deepEqual(loaned, ['Bramley Town', 'Kestrel Rovers', 'Port Ellis']);
});
