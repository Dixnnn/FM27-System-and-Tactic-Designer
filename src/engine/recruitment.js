// Recruitment helper: score the players of a shortlist or player search in your tactic's own positions
// and roles, and compare them with your starters and your cover. Same scoring as everything else, so a
// signing's number means exactly what your own players' numbers mean.

import { laneValue } from './depth.js';
import { slotRoleScore } from './roles.js';

const FORBIDDEN = -500;
const sameAs = (a, b) => (a.uid && b.uid ? a.uid === b.uid : a.name === b.name && (a.age == null || b.age == null || a.age === b.age));

/**
 * @param {object} result  analyse() result (main tactic, depth chart)
 * @param {object[]} candidates  players from readPlayers()
 * @param {{max?: number}} [opts]
 */
export function recruitment(result, candidates, { max = 25 } = {}) {
  const { best, ctx, depth } = result;
  const squad = result.players;
  const weak = new Set(depth.weakAreas.map((w) => w.lane));
  const fresh = candidates.filter((c) => !squad.some((p) => sameAs(p, c)));
  const inSquad = candidates.length - fresh.length;

  const rows = [];
  for (const c of fresh) {
    let top = null;
    best.lanes.forEach((lane, i) => {
      const value = laneValue(ctx, c, lane);
      if (value <= FORBIDDEN) return;
      const d = depth.lanes[i];
      const cover = d?.secondChoice?.value ?? null;
      const gain = value - lane.value;
      const coverGain = cover == null ? value : value - cover;
      // prefer the place where he helps most: starting first, then as cover
      const rank = gain > 0 ? 1000 + gain : coverGain > 0 ? coverGain : -1000 + value;
      if (!top || rank > top.rank) top = { lane, value, gain, cover, coverGain, rank, weak: weak.has(lane) };
    });
    if (!top) continue;
    const ip = slotRoleScore(c, top.lane.ipRole, top.lane.ip, ctx);
    const oop = slotRoleScore(c, top.lane.oopRole, top.lane.oop, ctx);
    const { ipWeight, oopWeight } = ctx.search;
    const spread = (ipWeight * (ip.hi - ip.lo) + oopWeight * (oop.hi - oop.lo)) / 2;
    const verdict = top.gain > 1 ? 'starts' : top.coverGain > 1 ? 'cover' : 'no';
    rows.push({
      player: c,
      lane: top.lane,
      value: top.value,
      gain: top.gain,
      teamGain: Math.max(0, top.gain) / best.lanes.length,
      cover: top.cover,
      coverGain: top.coverGain,
      weakArea: top.weak,
      spread,
      unknown: c.unknownAttrs.length,
      verdict,
    });
  }
  rows.sort((a, b) => (b.verdict === 'starts') - (a.verdict === 'starts') || b.gain - a.gain || b.coverGain - a.coverGain);
  // Best signing for each weak area of the depth chart.
  const forWeak = depth.weakAreas
    .map((w) => ({ area: w, pick: rows.filter((r) => r.lane === w.lane && r.verdict !== 'no').sort((a, b) => b.value - a.value)[0] || null }))
    .filter((x) => x.pick);
  return {
    total: candidates.length,
    inSquad,
    considered: fresh.length,
    noPlace: fresh.length - rows.length,
    starters: rows.filter((r) => r.verdict === 'starts').length,
    coverCount: rows.filter((r) => r.verdict === 'cover').length,
    rows: rows.slice(0, max),
    forWeak,
  };
}
