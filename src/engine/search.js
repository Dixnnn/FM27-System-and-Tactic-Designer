// Formation search. For every In Possession x Out of Possession formation pair:
//  1. pair IP slots with OOP slots by shortest movement ("lanes", e.g. OOP DL <-> IP WBL);
//  2. value of a player in a lane = ipWeight x best IP role score + oopWeight x best OOP role score;
//  3. Hungarian algorithm picks the optimal XI for the lanes;
//  4. roles are refined lane by lane for fit + team balance, then the XI is re-picked with those roles;
//  5. systems are ranked by fit + balance - a small complexity penalty for long transitions.

import { assignMax, hungarianMin } from './hungarian.js';
import { prepareRoles, roleFitsSlot, slotRoleScore, bestRoleScore, baseRoleScore } from './roles.js';
import { evaluateBalance, evaluatePlan } from './balance.js';
import { buildAdjacency, familiarity } from '../parse/positions.js';

const FORBIDDEN = -1000;

const REPRESENTATIVE_SLOT = {
  GK: 'GK', 'D (L)': 'DL', 'D (C)': 'DC', 'D (R)': 'DR', 'WB (L)': 'WBL', 'WB (R)': 'WBR', DM: 'DMC',
  'M (L)': 'ML', 'M (C)': 'MC', 'M (R)': 'MR', 'AM (L)': 'AML', 'AM (C)': 'AMC', 'AM (R)': 'AMR', 'ST (C)': 'STC',
};

/**
 * @param {object[]} players  from parsePlayers
 * @param {{roles:object, formations:object, tuning:object}} docs
 * @param {object} [options]  overrides for tuning.search (ipWeight, oopWeight, excludeInjured, ...)
 */
export function createContext(players, docs, options = {}) {
  const tuning = docs.tuning;
  const search = { ...tuning.search, ...options };
  const ctx = {
    players,
    tuning,
    search,
    roles: prepareRoles(docs.roles),
    slots: docs.formations.slots,
    formations: docs.formations,
    adjacency: buildAdjacency(tuning),
    slotForPosition: REPRESENTATIVE_SLOT,
    allowedFam: new Set(tuning.familiarity.allowInStartingXI),
    warnings: [],
  };
  const atClub = players.filter((p) => !p.onLoan);
  let available = atClub.filter((p) => !(search.excludeInjured && p.injured));
  if (available.length < 11) {
    ctx.warnings.push('Fewer than 11 fit players, so injured players were included.');
    available = atClub.length >= 11 ? atClub : players.slice();
  }
  ctx.available = available;
  return ctx;
}

/** Pair the slots of two formations so that the total (squared) movement is smallest. */
export function laneMatching(ipSlots, oopSlots, ctx) {
  const { laneCostX, laneCostY, laneMaxCost } = ctx.search;
  const cost = (a, b) => {
    const [ax, ay] = ctx.slots[a];
    const [bx, by] = ctx.slots[b];
    return laneCostX * Math.abs(ax - bx) + laneCostY * Math.abs(ay - by);
  };
  const matrix = ipSlots.map((a) =>
    oopSlots.map((b) => {
      if ((a === 'GK') !== (b === 'GK')) return 1e9;
      const c = cost(a, b);
      return c * c;
    }),
  );
  const rowToCol = hungarianMin(matrix);
  const lanes = ipSlots.map((a, i) => ({ ip: a, oop: oopSlots[rowToCol[i]], cost: cost(a, oopSlots[rowToCol[i]]) }));
  const maxCost = Math.max(...lanes.map((l) => l.cost));
  const meanCost = lanes.reduce((s, l) => s + l.cost, 0) / lanes.length;
  return { lanes, maxCost, meanCost, valid: maxCost <= laneMaxCost };
}

function allowedRoles(ctx, phase, slot, formationSlots) {
  const pos = ctx.slots[slot][2];
  return (ctx.roles.byPhasePosition[phase][pos] || []).filter((r) => roleFitsSlot(r, slot, ctx.slots, formationSlots));
}

function laneAllowed(ctx, player, lane) {
  const ipFam = familiarity(player, ctx.slots[lane.ip][2], ctx.adjacency);
  const oopFam = familiarity(player, ctx.slots[lane.oop][2], ctx.adjacency);
  return ctx.allowedFam.has(ipFam) && ctx.allowedFam.has(oopFam);
}

/**
 * Squad reference for a role: average base score of the squad's players who naturally play one of the
 * role's positions. Used only to choose between roles: among near-equal roles, a player gets the one
 * where he stands out most compared with his team-mates (e.g. the best passer of the centre-backs
 * becomes the Ball-Playing Centre-Back).
 */
function roleReference(ctx, role) {
  const cache = (ctx._roleRef ||= {});
  if (role.id in cache) return cache[role.id];
  const natural = ctx.players.filter((p) => role.positions.some((pos) => p.positions.has(pos)));
  const gkRole = role.positions.includes('GK');
  const pool = natural.length >= 2 ? natural : ctx.players.filter((p) => p.isGoalkeeper === gkRole);
  const values = pool.map((p) => baseRoleScore(p, role, ctx.tuning).v);
  cache[role.id] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return cache[role.id];
}

/** Score used to choose a role: absolute fit plus a small specialisation term. */
function choiceScore(ctx, player, role, slot) {
  const s = slotRoleScore(player, role, slot, ctx);
  const spec = s.base - roleReference(ctx, role);
  return s.score + ctx.tuning.roleScore.specialisationWeight * spec;
}

function bestOf(ctx, player, roles, slot, byChoice = false) {
  let best = null;
  for (const role of roles) {
    const s = slotRoleScore(player, role, slot, ctx);
    const v = byChoice ? choiceScore(ctx, player, role, slot) : s.score;
    if (!best || v > best.v) best = { role, s, v };
  }
  return best;
}

function laneValue(ctx, player, lane, fixed) {
  if (!laneAllowed(ctx, player, lane)) return FORBIDDEN;
  const { ipWeight, oopWeight } = ctx.search;
  const ipS = fixed ? slotRoleScore(player, fixed.ipRole, lane.ip, ctx).score : bestOf(ctx, player, lane.ipRoles, lane.ip).s.score;
  const oopS = fixed ? slotRoleScore(player, fixed.oopRole, lane.oop, ctx).score : bestOf(ctx, player, lane.oopRoles, lane.oop).s.score;
  return ipWeight * ipS + oopWeight * oopS;
}

function pickXI(ctx, lanes, roles) {
  const pool = ctx.available;
  const value = lanes.map((lane, i) => pool.map((p) => laneValue(ctx, p, lane, roles && roles[i])));
  const { rowToCol } = assignMax(value);
  return rowToCol.map((c) => pool[c]);
}

function objective(ctx, lanes, xi, roles) {
  const { ipWeight, oopWeight } = ctx.search;
  let fit = 0;
  let choice = 0;
  const full = lanes.map((lane, i) => {
    const p = xi[i];
    if (laneAllowed(ctx, p, lane)) {
      fit += ipWeight * slotRoleScore(p, roles[i].ipRole, lane.ip, ctx).score + oopWeight * slotRoleScore(p, roles[i].oopRole, lane.oop, ctx).score;
      choice += ipWeight * choiceScore(ctx, p, roles[i].ipRole, lane.ip) + oopWeight * choiceScore(ctx, p, roles[i].oopRole, lane.oop);
    } else {
      fit += FORBIDDEN;
      choice += FORBIDDEN;
    }
    return { ...lane, ipRole: roles[i].ipRole, oopRole: roles[i].oopRole };
  });
  fit /= lanes.length;
  choice /= lanes.length;
  const balance = evaluateBalance(full, ctx.slots, ctx.tuning.balance);
  if (ctx.plan) {
    const plan = evaluatePlan(full, ctx.slots, ctx.plan, ctx.tuning.plan);
    balance.points += plan.points;
    balance.notes.push(...plan.notes);
  }
  return { fit, balance, total: choice + balance.points };
}

function refineRoles(ctx, lanes, xi, roles) {
  roles = roles.map((r) => ({ ...r }));
  let best = objective(ctx, lanes, xi, roles).total;
  for (let pass = 0; pass < ctx.search.refinePasses; pass++) {
    let improved = false;
    lanes.forEach((lane, i) => {
      for (const [key, list] of [['ipRole', lane.ipRoles], ['oopRole', lane.oopRoles]]) {
        const current = roles[i][key];
        let bestRole = current;
        for (const role of list) {
          if (role === current) continue;
          roles[i][key] = role;
          const t = objective(ctx, lanes, xi, roles).total;
          if (t > best + 1e-9) {
            best = t;
            bestRole = role;
            improved = true;
          }
        }
        roles[i][key] = bestRole;
      }
    });
    if (!improved) break;
  }
  return roles;
}

/**
 * Try changing the roles of two players at once (same phase). Catches cases a one-at-a-time search
 * misses, e.g. turning a Playmaking Winger into a Winger so a Deep-Lying Playmaker fits the
 * "two playmakers at most" rule.
 */
function pairMoves(ctx, lanes, xi, roles) {
  roles = roles.map((r) => ({ ...r }));
  let best = objective(ctx, lanes, xi, roles).total;
  let improved = false;
  for (const [key, listKey] of [['ipRole', 'ipRoles'], ['oopRole', 'oopRoles']]) {
    for (let i = 0; i < lanes.length; i++) {
      for (let j = i + 1; j < lanes.length; j++) {
        const ci = roles[i][key];
        const cj = roles[j][key];
        let bi = ci;
        let bj = cj;
        for (const ri of lanes[i][listKey]) {
          if (ri === ci) continue;
          for (const rj of lanes[j][listKey]) {
            if (rj === cj) continue;
            roles[i][key] = ri;
            roles[j][key] = rj;
            const t = objective(ctx, lanes, xi, roles).total;
            if (t > best + 1e-9) {
              best = t;
              bi = ri;
              bj = rj;
              improved = true;
            }
          }
        }
        roles[i][key] = bi;
        roles[j][key] = bj;
      }
    }
  }
  return { roles, improved };
}

function deepRefine(ctx, lanes, xi, roles) {
  for (let round = 0; round < 3; round++) {
    const pm = pairMoves(ctx, lanes, xi, roles);
    if (!pm.improved) break;
    roles = refineRoles(ctx, lanes, xi, pm.roles);
  }
  return roles;
}

/**
 * Evaluate one IP x OOP formation pair. Returns null if the shapes can't be linked sensibly.
 * deep = also try two-role changes (slower; used for the best systems).
 */
export function evaluateSystem(ctx, ipF, oopF, deep = false) {
  const match = laneMatching(ipF.slots, oopF.slots, ctx);
  if (!match.valid) return null;
  const lanes = match.lanes.map((l) => ({
    ...l,
    ipRoles: allowedRoles(ctx, 'IP', l.ip, ipF.slots),
    oopRoles: allowedRoles(ctx, 'OOP', l.oop, oopF.slots),
  }));
  if (lanes.some((l) => !l.ipRoles.length || !l.oopRoles.length)) return null;

  let xi = pickXI(ctx, lanes, null);
  let roles = xi.map((p, i) => ({
    ipRole: bestOf(ctx, p, lanes[i].ipRoles, lanes[i].ip, true).role,
    oopRole: bestOf(ctx, p, lanes[i].oopRoles, lanes[i].oop, true).role,
  }));
  roles = refineRoles(ctx, lanes, xi, roles);
  if (deep) roles = deepRefine(ctx, lanes, xi, roles);
  let best = { xi, roles, obj: objective(ctx, lanes, xi, roles) };
  for (let iter = 0; iter < 3; iter++) {
    const xi2 = pickXI(ctx, lanes, roles);
    if (xi2.every((p, i) => p === xi[i])) break;
    xi = xi2;
    roles = refineRoles(ctx, lanes, xi, roles);
    if (deep) roles = deepRefine(ctx, lanes, xi, roles);
    const obj = objective(ctx, lanes, xi, roles);
    if (obj.total > best.obj.total) best = { xi, roles, obj };
    else break;
  }

  const { ipWeight, oopWeight } = ctx.search;
  const resultLanes = lanes.map((lane, i) => {
    const player = best.xi[i];
    const ipRole = best.roles[i].ipRole;
    const oopRole = best.roles[i].oopRole;
    const ipScore = slotRoleScore(player, ipRole, lane.ip, ctx);
    const oopScore = slotRoleScore(player, oopRole, lane.oop, ctx);
    return {
      ip: lane.ip,
      oop: lane.oop,
      cost: lane.cost,
      ipRoles: lane.ipRoles,
      oopRoles: lane.oopRoles,
      player,
      ipRole,
      oopRole,
      ipScore,
      oopScore,
      value: ipWeight * ipScore.score + oopWeight * oopScore.score,
      forbidden: !laneAllowed(ctx, player, lane),
    };
  });
  const complexity = match.meanCost * ctx.search.complexityPenaltyPerCost;
  const fit = best.obj.fit;
  return {
    ipName: ipF.name,
    oopName: oopF.name,
    ipFormation: ipF,
    oopFormation: oopF,
    ipSlots: ipF.slots,
    oopSlots: oopF.slots,
    lanes: resultLanes,
    fit,
    balance: best.obj.balance,
    complexity,
    score: fit + best.obj.balance.points - complexity,
    valid: !resultLanes.some((l) => l.forbidden),
  };
}

function closestPartner(ctx, ipF) {
  let best = null;
  for (const oopF of ctx.formations.outOfPossession) {
    const m = laneMatching(ipF.slots, oopF.slots, ctx);
    if (m.valid && (!best || m.meanCost < best.cost)) best = { oopF, cost: m.meanCost };
  }
  return best?.oopF;
}

/** Test every formation pair and rank them; the best few get a deeper role search. */
export function searchSystems(ctx, { polishTop = ctx.search.polishTop, quick = false } = {}) {
  let results = [];
  for (const ipF of ctx.formations.inPossession) {
    // quick: only pair each in-possession shape with the out-of-possession shape closest to it
    const partners = quick ? [closestPartner(ctx, ipF)].filter(Boolean) : ctx.formations.outOfPossession;
    for (const oopF of partners) {
      const r = evaluateSystem(ctx, ipF, oopF);
      if (r) results.push(r);
    }
  }
  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, polishTop).map((r) => {
    const deep = evaluateSystem(ctx, r.ipFormation, r.oopFormation, true);
    return deep && deep.score > r.score ? deep : r;
  });
  results = [...top, ...results.slice(polishTop)];
  const valid = results.filter((r) => r.valid);
  const ranked = (valid.length ? valid : results).sort((a, b) => b.score - a.score);
  if (!valid.length && results.length) ctx.warnings.push('No formation could be filled without playing someone out of position.');
  return { best: ranked[0] || null, ranking: ranked, tested: results.length };
}

/** Score of every player for every role (best position for that role), for the suitability table. */
export function suitabilityTable(ctx) {
  return ctx.players.map((p) => ({
    player: p,
    scores: Object.fromEntries(ctx.roles.roles.map((r) => [r.id, bestRoleScore(p, r, ctx)])),
  }));
}
