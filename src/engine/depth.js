// Depth chart: a second choice for every position (an exact second XI for the same system and roles),
// the next best options per position, and weak areas worth strengthening in the transfer market.

import { assignMax } from './hungarian.js';
import { slotRoleScore } from './roles.js';
import { familiarity } from '../parse/positions.js';

const FORBIDDEN = -1000;

function laneValue(ctx, p, lane) {
  const ipFam = familiarity(p, ctx.slots[lane.ip][2], ctx.adjacency);
  const oopFam = familiarity(p, ctx.slots[lane.oop][2], ctx.adjacency);
  if (!ctx.allowedFam.has(ipFam) || !ctx.allowedFam.has(oopFam)) return FORBIDDEN;
  const { ipWeight, oopWeight } = ctx.search;
  return ipWeight * slotRoleScore(p, lane.ipRole, lane.ip, ctx).score + oopWeight * slotRoleScore(p, lane.oopRole, lane.oop, ctx).score;
}

/**
 * @param {object} system  the chosen system
 * @param {object} ctx  search context
 */
export function depthChart(system, ctx) {
  const cfg = ctx.tuning.depth;
  const xi = new Set(system.lanes.map((l) => l.player));
  const atClub = ctx.players.filter((p) => !p.onLoan);
  const bench = atClub.filter((p) => !xi.has(p));
  const fitBench = bench.filter((p) => !p.injured);

  // Exact second XI from fit players outside the first XI
  const value = system.lanes.map((lane) => fitBench.map((p) => laneValue(ctx, p, lane)));
  const second = fitBench.length ? assignMax(value).rowToCol : [];

  const lanes = system.lanes.map((lane, i) => {
    const options = bench
      .map((p) => ({ player: p, value: laneValue(ctx, p, lane), injured: p.injured }))
      .filter((o) => o.value > FORBIDDEN / 2)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    const c = second[i];
    const secondChoice = c != null && c >= 0 && value[i][c] > FORBIDDEN / 2 ? { player: fitBench[c], value: value[i][c] } : null;
    const loanOptions = ctx.players
      .filter((p) => p.onLoan)
      .map((p) => ({ player: p, value: laneValue(ctx, p, lane) }))
      .filter((o) => o.value > FORBIDDEN / 2 && o.value >= (secondChoice?.value ?? 0) + 2)
      .sort((a, b) => b.value - a.value)
      .slice(0, 2);
    return { lane, starter: lane.player, starterValue: lane.value, secondChoice, options, loanOptions };
  });

  const weakAreas = [];
  for (const d of lanes) {
    const reasons = [];
    if (d.starterValue < system.fit - cfg.weakStarterGap || d.starterValue < cfg.weakStarterAbsolute) {
      reasons.push(`the starter's fit (${d.starterValue.toFixed(0)}) is well below the team average (${system.fit.toFixed(0)})`);
    }
    // Injured players come back, so they count as cover here (but not players out on loan).
    const injuredCover = d.options.find((o) => o.injured);
    const coverValue = Math.max(d.secondChoice?.value ?? -Infinity, injuredCover?.value ?? -Infinity);
    if (coverValue === -Infinity) reasons.push('nobody else in the squad can cover this position');
    else if (coverValue < d.starterValue - cfg.thinCoverGap) {
      const c = d.secondChoice && d.secondChoice.value >= (injuredCover?.value ?? -Infinity) ? d.secondChoice : injuredCover;
      reasons.push(`the best cover, ${c.player.name} (${c.value.toFixed(0)}), is a big drop from the starter`);
    }
    if (!reasons.length) continue;
    const lane = d.lane;
    const keys = [...new Set([...lane.ipRole.key, ...lane.oopRole.key])];
    const p = lane.player;
    const lookFor = keys
      .map((a) => ({ attr: a, starter: p.attrs[a]?.v ?? null }))
      .sort((a, b) => (a.starter ?? 0) - (b.starter ?? 0))
      .slice(0, 6);
    weakAreas.push({ lane, reasons, lookFor, priority: system.fit - d.starterValue + (coverValue > -Infinity ? (d.starterValue - coverValue) / 2 : 10) });
  }
  weakAreas.sort((a, b) => b.priority - a.priority);
  return { lanes, weakAreas };
}
