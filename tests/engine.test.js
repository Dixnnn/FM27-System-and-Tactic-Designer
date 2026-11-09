import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignMax, hungarianMin } from '../src/engine/hungarian.js';
import { prepareRoles, baseRoleScore, slotRoleScore, footFactor, roleFitsSlot } from '../src/engine/roles.js';
import { createContext, searchSystems, laneMatching } from '../src/engine/search.js';
import { evaluateBalance } from '../src/engine/balance.js';
import { ALL_POSITIONS } from '../src/parse/positions.js';
import { analyse } from '../src/analyse.js';
import { docs, sample, fakePlayer, SAMPLE_FILES } from './helpers.js';

// ---------- data files ----------

test('roles.json: 79 roles, 40 in possession and 39 out of possession, valid attributes and positions', () => {
  const attrNames = new Set(docs.columns.attributes.map((a) => a.field));
  const roles = docs.roles.roles;
  assert.equal(roles.length, 79);
  assert.equal(roles.filter((r) => r.phase === 'IP').length, 40);
  assert.equal(roles.filter((r) => r.phase === 'OOP').length, 39);
  assert.equal(new Set(roles.map((r) => r.id)).size, roles.length, 'ids are unique');
  for (const r of roles) {
    for (const a of [...r.key, ...r.preferred]) assert.ok(attrNames.has(a), `${r.name}: unknown attribute ${a}`);
    for (const p of r.positions) assert.ok(ALL_POSITIONS.includes(p), `${r.name}: unknown position ${p}`);
    assert.ok(r.key.length >= 3, r.name);
    assert.ok(docs.tuning.foot.rules[r.foot], `${r.name}: unknown foot rule`);
  }
  for (const pos of ALL_POSITIONS) {
    assert.ok(roles.some((r) => r.phase === 'IP' && r.positions.includes(pos)), `IP role for ${pos}`);
    assert.ok(roles.some((r) => r.phase === 'OOP' && r.positions.includes(pos)), `OOP role for ${pos}`);
  }
});

test('formations.json: 11 different known slots, goalkeeper first', () => {
  const { slots } = docs.formations;
  for (const f of [...docs.formations.inPossession, ...docs.formations.outOfPossession]) {
    assert.equal(f.slots.length, 11, f.name);
    assert.equal(new Set(f.slots).size, 11, f.name);
    assert.equal(f.slots[0], 'GK', f.name);
    for (const s of f.slots) assert.ok(slots[s], `${f.name}: ${s}`);
  }
});

// ---------- Hungarian algorithm ----------

function bruteForceMax(value) {
  const rows = value.length;
  const cols = value[0].length;
  let best = -Infinity;
  const used = new Array(cols).fill(false);
  const rec = (r, sum, assigned) => {
    if (r === rows || assigned === Math.min(rows, cols)) {
      best = Math.max(best, sum);
      return;
    }
    if (rows - r > cols - assigned) rec(r + 1, sum, assigned); // leave this row unassigned (more rows than cols)
    for (let c = 0; c < cols; c++) {
      if (used[c]) continue;
      used[c] = true;
      rec(r + 1, sum + value[r][c], assigned + 1);
      used[c] = false;
    }
  };
  rec(0, 0, 0);
  return best;
}

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

test('Hungarian algorithm matches brute force on random matrices', () => {
  const rand = rng(7);
  for (let k = 0; k < 120; k++) {
    const rows = 1 + Math.floor(rand() * 6);
    const cols = 1 + Math.floor(rand() * 7);
    const m = Array.from({ length: rows }, () => Array.from({ length: cols }, () => Math.round(rand() * 100)));
    const { rowToCol, total } = assignMax(m);
    assert.equal(total, bruteForceMax(m), JSON.stringify(m));
    const used = rowToCol.filter((c) => c >= 0);
    assert.equal(new Set(used).size, used.length, 'no column used twice');
    assert.equal(used.length, Math.min(rows, cols));
  }
});

test('Hungarian beats greedy picking', () => {
  // Greedy would give row 0 its best (col 0: 10) and leave row 1 with 1 => 11. Optimal is 9 + 8 = 17.
  const m = [[10, 9], [8, 1]];
  assert.equal(assignMax(m).total, 17);
  assert.deepEqual(hungarianMin([[1, 2], [2, 4]]), [1, 0]);
});

// ---------- role scoring ----------

const ctxFor = (players) => createContext(players, docs);

test('role scores follow the attributes: a crosser suits Winger, a finisher suits Inside Forward', () => {
  const roles = prepareRoles(docs.roles);
  const winger = fakePlayer({ base: 10, attrs: { Crossing: 18, Dribbling: 16, Pace: 17, Acceleration: 17, Agility: 15, Technique: 15, Finishing: 7 }, positions: ['AM (L)'] });
  const forward = fakePlayer({ base: 10, attrs: { Finishing: 18, 'Off the Ball': 17, Anticipation: 16, Composure: 16, Dribbling: 15, 'First Touch': 15, Crossing: 6 }, positions: ['AM (L)'] });
  const W = roles.byId['IP:W'];
  const IF = roles.byId['IP:IF'];
  assert.ok(baseRoleScore(winger, W, docs.tuning).v > baseRoleScore(winger, IF, docs.tuning).v);
  assert.ok(baseRoleScore(forward, IF, docs.tuning).v > baseRoleScore(forward, W, docs.tuning).v);
});

test('scores run from 0 (all 1s) to 100 (all 20s)', () => {
  const roles = prepareRoles(docs.roles);
  const cb = roles.byId['IP:CB'];
  assert.equal(Math.round(baseRoleScore(fakePlayer({ base: 1, height: null }), cb, docs.tuning).v), 0);
  assert.equal(Math.round(baseRoleScore(fakePlayer({ base: 20, height: null }), cb, docs.tuning).v), 100);
});

test('footedness: an inside forward on the left wants a strong right foot, a winger a strong left foot', () => {
  const roles = prepareRoles(docs.roles);
  const rightFooted = fakePlayer({ left: 0.25, right: 1 });
  const leftFooted = fakePlayer({ left: 1, right: 0.25 });
  assert.ok(footFactor(rightFooted, roles.byId['IP:IF'], 'AML', docs.tuning) > footFactor(leftFooted, roles.byId['IP:IF'], 'AML', docs.tuning));
  assert.ok(footFactor(leftFooted, roles.byId['IP:W'], 'AML', docs.tuning) > footFactor(rightFooted, roles.byId['IP:W'], 'AML', docs.tuning));
  assert.equal(footFactor(leftFooted, roles.byId['IP:CM'], 'MCL', docs.tuning), 1);
});

test('position familiarity lowers the score', () => {
  const p = fakePlayer({ base: 14, positions: ['D (R)'] });
  const ctx = ctxFor([p]);
  const fb = ctx.roles.byId['IP:FB'];
  const natural = slotRoleScore(p, fb, 'DR', ctx);
  const otherSide = slotRoleScore(p, fb, 'DL', ctx);
  assert.equal(natural.familiarity, 'Natural');
  assert.equal(otherSide.familiarity, 'Unconvincing');
  assert.ok(otherSide.score < natural.score);
});

test('scouting ranges give a low/high spread around the midpoint', () => {
  const p = fakePlayer({ base: 12, attrs: { Tackling: { v: 12.5, lo: 10, hi: 15, range: true } }, positions: ['D (C)'] });
  const s = baseRoleScore(p, prepareRoles(docs.roles).byId['IP:CB'], docs.tuning);
  assert.ok(s.lo < s.v && s.v < s.hi);
});

test('taller players get a small bonus in aerial roles only', () => {
  const roles = prepareRoles(docs.roles);
  const tall = fakePlayer({ height: 195 });
  const short = fakePlayer({ height: 170 });
  assert.ok(baseRoleScore(tall, roles.byId['IP:CB'], docs.tuning).v > baseRoleScore(short, roles.byId['IP:CB'], docs.tuning).v);
  assert.equal(baseRoleScore(tall, roles.byId['IP:AP'], docs.tuning).v, baseRoleScore(short, roles.byId['IP:AP'], docs.tuning).v);
});

test('wide centre-back roles only on the outside of a back three', () => {
  const roles = prepareRoles(docs.roles);
  const wcb = roles.byId['IP:WCB'];
  assert.equal(roleFitsSlot(wcb, 'DCL', docs.formations.slots, ['GK', 'DCL', 'DC', 'DCR']), true);
  assert.equal(roleFitsSlot(wcb, 'DCL', docs.formations.slots, ['GK', 'DL', 'DCL', 'DCR', 'DR']), false);
});

// ---------- formation search ----------

test('lane matching pairs slots without long moves', () => {
  const ctx = ctxFor([]);
  const ip = docs.formations.inPossession.find((f) => f.name === '4-2-3-1 DM AM Wide');
  const oop = docs.formations.outOfPossession.find((f) => f.name === '4-4-1-1 2DM');
  const m = laneMatching(ip.slots, oop.slots, ctx);
  assert.ok(m.valid);
  const lane = (slot) => m.lanes.find((l) => l.ip === slot).oop;
  assert.equal(lane('GK'), 'GK');
  assert.equal(lane('AML'), 'ML');
  assert.equal(lane('AMR'), 'MR');
});

for (const file of SAMPLE_FILES) {
  test(`search on ${file}: valid XI, valid roles, nobody injured`, () => {
    const result = analyse(sample(file), file, docs);
    assert.ok(result.ok, result.error);
    const best = result.search.best;
    assert.ok(result.search.tested > 100);
    assert.equal(best.lanes.length, 11);
    const ids = best.lanes.map((l) => l.player.id);
    assert.equal(new Set(ids).size, 11, 'eleven different players');
    for (const l of best.lanes) {
      assert.equal(l.forbidden, false, `${l.player.name} out of position`);
      assert.equal(l.player.injured, false, `${l.player.name} is injured`);
      assert.ok(l.ipRole.phase === 'IP' && l.oopRole.phase === 'OOP');
      assert.ok(l.ipRole.positions.includes(docs.formations.slots[l.ip][2]), `${l.ipRole.name} at ${l.ip}`);
      assert.ok(l.oopRole.positions.includes(docs.formations.slots[l.oop][2]), `${l.oopRole.name} at ${l.oop}`);
      assert.ok(l.ipScore.score > 0 && l.ipScore.score <= 100);
    }
    assert.equal(best.lanes.filter((l) => l.ip === 'GK').length, 1);
    assert.ok(result.search.ranking[0].score >= result.search.ranking[1].score, 'ranked best first');
  });
}

test('injured players can be included when asked', () => {
  const result = analyse(sample('squad_20261108_201500.csv'), 'squad.csv', docs, { excludeInjured: false });
  assert.ok(result.search.best.lanes.some((l) => l.player.injured), 'the injured poacher is good enough to start');
});

test('the XI is the best possible for the chosen system (no swap improves it)', () => {
  const result = analyse(sample('squad_20261108_201500.csv'), 'squad.csv', docs);
  const { best } = result.search;
  const ctx = result.ctx;
  const value = (p, l) => 0.5 * slotRoleScore(p, l.ipRole, l.ip, ctx).score + 0.5 * slotRoleScore(p, l.oopRole, l.oop, ctx).score;
  const inXI = new Set(best.lanes.map((l) => l.player));
  for (const l of best.lanes) {
    for (const bench of ctx.available.filter((p) => !inXI.has(p))) {
      const fam = slotRoleScore(bench, l.ipRole, l.ip, ctx).familiarity;
      if (!ctx.allowedFam.has(fam)) continue;
      assert.ok(value(bench, l) <= value(l.player, l) + 1e-9, `${bench.name} would beat ${l.player.name} at ${l.ip}`);
    }
  }
});

// ---------- balance ----------

function lanesWith(ipRoleIds, oopRoleIds, ipSlots, oopSlots) {
  const roles = prepareRoles(docs.roles);
  return ipSlots.map((s, i) => ({ ip: s, oop: oopSlots[i], ipRole: roles.byId[ipRoleIds[i]], oopRole: roles.byId[oopRoleIds[i]] }));
}

test('balance: attacking full-backs without cover are penalised', () => {
  const slots = ['GK', 'DL', 'DCL', 'DCR', 'DR', 'DMCL', 'DMCR', 'AML', 'AMC', 'AMR', 'STC'];
  const oop = ['IP:GK', 'OOP:FB', 'OOP:CB', 'OOP:CB', 'OOP:FB', 'OOP:PDM', 'OOP:SDM', 'OOP:W', 'OOP:AM', 'OOP:W', 'OOP:CFD'].map((id) => id.replace('IP:GK', 'OOP:GK'));
  const risky = lanesWith(['IP:GK', 'IP:WB', 'IP:CB', 'IP:CB', 'IP:WB', 'IP:BBM', 'IP:DLP', 'IP:W', 'IP:AM', 'IP:W', 'IP:CFD'], oop, slots, slots);
  const safe = lanesWith(['IP:GK', 'IP:WB', 'IP:CB', 'IP:CB', 'IP:WB', 'IP:DM', 'IP:DLP', 'IP:W', 'IP:AM', 'IP:W', 'IP:CFD'], oop, slots, slots);
  const r = evaluateBalance(risky, docs.formations.slots, docs.tuning.balance);
  const s = evaluateBalance(safe, docs.formations.slots, docs.tuning.balance);
  assert.ok(r.notes.some((n) => /attacking full-backs/.test(n.text)));
  assert.ok(!s.notes.some((n) => /attacking full-backs/.test(n.text)));
  assert.ok(s.points > r.points);
});

test('balance: no width on a flank and too many playmakers are flagged', () => {
  const slots = ['GK', 'DL', 'DCL', 'DCR', 'DR', 'DMCL', 'DMCR', 'AML', 'AMC', 'AMR', 'STC'];
  const ip = ['IP:GK', 'IP:IFB', 'IP:CB', 'IP:CB', 'IP:FB', 'IP:DLP', 'IP:BBP', 'IP:IF', 'IP:AP', 'IP:W', 'IP:CFD'];
  const oop = ['OOP:GK', 'OOP:FB', 'OOP:CB', 'OOP:CB', 'OOP:FB', 'OOP:PDM', 'OOP:SDM', 'OOP:W', 'OOP:AM', 'OOP:W', 'OOP:CFD'];
  const b = evaluateBalance(lanesWith(ip, oop, slots, slots), docs.formations.slots, docs.tuning.balance);
  assert.ok(b.notes.some((n) => /wide on the left/.test(n.text)));
  assert.ok(b.notes.some((n) => /3 playmakers/.test(n.text)));
});
