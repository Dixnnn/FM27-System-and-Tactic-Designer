// Your picks: players who must start, marquee players (the tactic is built around them) and future stars
// (young talent to develop). Picks are saved per club by a stable key (Unique ID, or the name).

import { slotRoleScore } from './roles.js';
import { familiarity } from '../parse/positions.js';

export const LABELS = { marquee: 'Marquee', future: 'Future star' };
const HARD_TO_TRAIN = new Set(['Aggression', 'Bravery', 'Determination', 'Flair', 'Leadership', 'Natural Fitness']);

export const playerKey = (p) => p.uid || p.name;

/**
 * Put picks onto the parsed players (p.mustStart, p.label).
 * @param {object[]} players
 * @param {Object<string, {start?:boolean, label?:'marquee'|'future'|null}>} picks  keyed by playerKey
 * @returns {{ignored: Array<{player, reason}>}}
 */
export function applyPicks(players, picks = {}) {
  const ignored = [];
  for (const p of players) {
    const pick = picks[playerKey(p)] || {};
    const label = pick.label === 'marquee' || pick.label === 'future' ? pick.label : null;
    p.label = label;
    p.mustStart = !!pick.start || label === 'marquee';
    p.unavailable = !!pick.out && !p.onLoan;
    if (p.unavailable) p.mustStart = false;
    if (p.onLoan && (p.mustStart || label)) {
      ignored.push({ player: p, reason: `out on loan${p.club ? ' at ' + p.club : ''}` });
      p.mustStart = false;
    }
  }
  return { ignored };
}

/** Problems that make the picks impossible before any search is run. */
export function checkPicks(players) {
  const locked = players.filter((p) => p.mustStart && !p.onLoan);
  const problems = [];
  if (locked.length > 11) problems.push(`${locked.length} players are marked to start, but only 11 can.`);
  const keepers = locked.filter((p) => p.isGoalkeeper);
  if (keepers.length > 1) problems.push(`${keepers.map((p) => p.name).join(' and ')} are both goalkeepers; only one can start.`);
  return problems;
}

export const hasPicks = (players) => players.some((p) => p.mustStart || p.label);

/** Players you marked unavailable. */
export const unavailablePlayers = (players) => players.filter((p) => p.unavailable);

/** Best possible IP and OOP roles for a player anywhere (from the suitability table). */
function bestRoles(result, p) {
  const scores = result.suitability.find((s) => s.player === p)?.scores || {};
  const top = (phase) =>
    result.ctx.roles.roles
      .filter((r) => r.phase === phase && scores[r.id])
      .map((r) => ({ role: r, score: scores[r.id].score }))
      .sort((a, b) => b.score - a.score)[0];
  return { ip: top('IP'), oop: top('OOP') };
}

/** What happened to each picked player in the main tactic. */
export function picksSummary(result) {
  const lanes = result.best.lanes;
  return result.players
    .filter((p) => !p.onLoan && (p.mustStart || p.label))
    .map((p) => {
      const lane = lanes.find((l) => l.player === p) || null;
      const best = bestRoles(result, p);
      const inBest = lane && best.ip && lane.ipRole.id === best.ip.role.id;
      return { player: p, lane, best, inBestRole: !!inBest };
    })
    .sort((a, b) => (b.player.label === 'marquee') - (a.player.label === 'marquee') || (b.player.label === 'future') - (a.player.label === 'future'));
}

/**
 * A development plan per future star: the position and roles he grows into in this tactic, how far he is from
 * starting there, which key attributes to train, and how to give him minutes.
 */
export function futureStarPlans(result) {
  const { ctx, best, depth } = result;
  const { ipWeight, oopWeight } = ctx.search;
  return result.players
    .filter((p) => p.label === 'future' && !p.onLoan)
    .map((p) => {
      let lane = best.lanes.find((l) => l.player === p);
      const starting = !!lane;
      let value = lane ? lane.value : null;
      if (!lane) {
        // the lane of this system where he fits best (a position he can play)
        for (const l of best.lanes) {
          const fams = [familiarity(p, ctx.slots[l.ip][2], ctx.adjacency), familiarity(p, ctx.slots[l.oop][2], ctx.adjacency)];
          if (!fams.every((f) => ctx.allowedFam.has(f))) continue;
          const v = ipWeight * slotRoleScore(p, l.ipRole, l.ip, ctx).score + oopWeight * slotRoleScore(p, l.oopRole, l.oop, ctx).score;
          if (value == null || v > value) [lane, value] = [l, v];
        }
      }
      const second = lane && depth.lanes.find((d) => d.lane === lane)?.secondChoice?.player === p;
      const gap = lane && !starting ? lane.value - value : 0;
      const keys = lane ? [...new Set([...lane.ipRole.key, ...lane.oopRole.key])].filter((a) => p.attrs[a] && !HARD_TO_TRAIN.has(a)) : [];
      const avg = keys.reduce((s, a) => s + p.attrs[a].v, 0) / Math.max(1, keys.length);
      const train = keys
        .map((a) => ({ attr: a, value: p.attrs[a].v }))
        .sort((a, b) => a.value - b.value)
        .filter((x) => x.value <= avg)
        .slice(0, 3);
      let minutes;
      if (!lane) minutes = 'He has no natural place in this system yet. Look at the "With your future stars starting" alternative, or a loan.';
      else if (starting) minutes = 'Starts in this tactic: regular minutes are the best way for him to develop.';
      else if (gap <= 5) minutes = `Close to a place (${gap.toFixed(0)} behind ${lane.player.name}): rotate them and give him plenty of starts.`;
      else if (gap <= 12) minutes = `Some way behind ${lane.player.name} (${gap.toFixed(0)}): give him cup games and late substitute appearances in this role.`;
      else minutes = `Not ready to start in this role yet (${gap.toFixed(0)} behind): a loan for regular football may help most.`;
      return { player: p, lane, starting, second, value, gap, train, minutes };
    });
}
