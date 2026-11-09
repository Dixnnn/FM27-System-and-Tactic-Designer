// Role suitability: how well a player fits an FM27 role in a given slot, as a 0-100 score.
//
//   base   = roleBlend x (key attributes x3 + preferred x1.5, averaged)
//          + generalBlend x (attributes the match engine rewards for everyone: pace, acceleration, ...)
//          + height bonus for aerial roles
//   score  = base x familiarity factor (Natural 1.0 ... Awkward 0.6) x footedness factor
//
// Scouting ranges are scored at their midpoint; the low/high ends give the "+/-" uncertainty.

import { familiarity } from '../parse/positions.js';

const norm = (v) => ((v - 1) / 19) * 100;

/** Build lookups for the role file. */
export function prepareRoles(rolesDoc) {
  const roles = rolesDoc.roles.map((r) => ({ ...r, keySet: new Set(r.key), tagSet: new Set(r.tags || []) }));
  const byId = Object.fromEntries(roles.map((r) => [r.id, r]));
  const byPhasePosition = { IP: {}, OOP: {} };
  for (const r of roles) {
    for (const pos of r.positions) (byPhasePosition[r.phase][pos] ||= []).push(r);
  }
  return { roles, byId, byPhasePosition };
}

/** Weighted average of normalised attributes, with low/high ends and the share of weight that was unknown. */
function weightedAttributes(player, weights) {
  let sum = 0;
  let lo = 0;
  let hi = 0;
  let known = 0;
  let total = 0;
  for (const [attr, w] of weights) {
    total += w;
    const a = player.attrs[attr];
    if (!a) continue;
    known += w;
    sum += w * norm(a.v);
    lo += w * norm(a.lo);
    hi += w * norm(a.hi);
  }
  if (!known) return { v: null, lo: null, hi: null, missingShare: 1 };
  return { v: sum / known, lo: lo / known, hi: hi / known, missingShare: total ? 1 - known / total : 0 };
}

function roleWeights(role, tuning) {
  const { keyWeight, preferredWeight } = tuning.roleScore;
  const w = new Map();
  for (const a of role.key) w.set(a, keyWeight);
  for (const a of role.preferred) if (!w.has(a)) w.set(a, preferredWeight);
  return [...w.entries()];
}

const isGoalkeeperRole = (role) => role.positions.includes('GK');

/** Role score before position familiarity and footedness. Cached on the player object. */
export function baseRoleScore(player, role, tuning) {
  const cache = (player._base ||= {});
  if (cache[role.id]) return cache[role.id];
  const rs = tuning.roleScore;
  const roleAvg = weightedAttributes(player, (role._w ||= roleWeights(role, tuning)));
  const gk = isGoalkeeperRole(role);
  const generalWeights = Object.entries(gk ? rs.goalkeeperGeneralWeights : rs.generalWeights);
  const general = weightedAttributes(player, generalWeights);
  const gBlend = gk ? rs.goalkeeperGeneralBlend : rs.generalBlend;
  let result;
  if (roleAvg.v == null) {
    result = { v: 0, lo: 0, hi: 0, missingShare: 1, heightBonus: 0 };
  } else {
    const g = general.v == null ? roleAvg : general;
    const blend = (x, y) => (1 - gBlend) * x + gBlend * y;
    const hb = heightBonus(player, role, tuning);
    result = {
      v: blend(roleAvg.v, g.v) + hb,
      lo: blend(roleAvg.lo, g.lo) + hb,
      hi: blend(roleAvg.hi, g.hi) + hb,
      missingShare: roleAvg.missingShare,
      heightBonus: hb,
    };
  }
  cache[role.id] = result;
  return result;
}

export function heightBonus(player, role, tuning) {
  const h = tuning.roleScore.height;
  if (!player.heightCm || !h.appliesWhenKeyIncludes.every((a) => role.keySet.has(a))) return 0;
  const pts = (player.heightCm - h.pivotCm) * h.pointsPerCm;
  return Math.max(-h.maxPoints, Math.min(h.maxPoints, pts));
}

/** Side of a slot code: "L", "R" or "C". */
export function slotSide(slotCode) {
  if (/L$/.test(slotCode)) return 'L';
  if (/R$/.test(slotCode)) return 'R';
  return 'C';
}

/** Footedness factor: e.g. an inside forward on the left wants a strong right foot. */
export function footFactor(player, role, slotCode, tuning) {
  const rule = tuning.foot.rules[role.foot || 'either'];
  const side = slotSide(slotCode);
  if (!rule || side === 'C' || rule.span === 0) return 1;
  const sameFoot = side === 'L' ? player.leftFoot : player.rightFoot;
  const otherFoot = side === 'L' ? player.rightFoot : player.leftFoot;
  const wanted = role.foot.startsWith('inverted') ? otherFoot : sameFoot;
  if (wanted == null) return 1;
  return rule.base + rule.span * wanted;
}

/** Can this role be used in this slot of this formation? */
export function roleFitsSlot(role, slotCode, slotsDoc, formationSlots) {
  const pos = slotsDoc[slotCode][2];
  if (!role.positions.includes(pos)) return false;
  if (role.slotRule === 'wideCentreBackInBackThree') {
    return (slotCode === 'DCL' || slotCode === 'DCR') && formationSlots.includes('DC');
  }
  if (role.slotRule === 'sideCentralMidfield') return slotCode === 'MCL' || slotCode === 'MCR';
  return true;
}

/**
 * Full score of a player in a role at a slot.
 * @returns {{score:number, lo:number, hi:number, base:number, familiarity:string, famFactor:number,
 *            footFactor:number, missingShare:number}}
 */
export function slotRoleScore(player, role, slotCode, ctx) {
  const key = `${role.id}@${slotCode}`;
  const cache = (player._slot ||= {});
  if (cache[key]) return cache[key];
  const pos = ctx.slots[slotCode][2];
  const fam = familiarity(player, pos, ctx.adjacency);
  const famFactor = ctx.tuning.familiarity.levels[fam];
  const ff = footFactor(player, role, slotCode, ctx.tuning);
  const base = baseRoleScore(player, role, ctx.tuning);
  const k = famFactor * ff;
  const result = {
    score: base.v * k,
    lo: base.lo * k,
    hi: base.hi * k,
    base: base.v,
    familiarity: fam,
    famFactor,
    footFactor: ff,
    missingShare: base.missingShare,
  };
  cache[key] = result;
  return result;
}

/** Best score of a player for a role at any position the role can be played in (for the suitability table). */
export function bestRoleScore(player, role, ctx) {
  let best = null;
  for (const pos of role.positions) {
    const slot = ctx.slotForPosition[pos];
    if (!slot) continue;
    const s = slotRoleScore(player, role, slot, ctx);
    if (!best || s.score > best.score) best = { ...s, position: pos };
  }
  return best;
}
