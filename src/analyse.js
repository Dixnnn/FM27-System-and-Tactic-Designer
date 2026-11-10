// The whole pipeline: export file text -> players -> tactic. Used by the app and by the dev CLI.

import { readExport } from './input/index.js';
import { buildHeaderMap } from './parse/columns.js';
import { parsePlayers } from './parse/player.js';
import { checkColumns } from './parse/validate.js';
import { createContext, searchSystems, suitabilityTable } from './engine/search.js';
import { squadProfile } from './engine/profile.js';
import { decideInstructions, derivePlan } from './engine/instructions.js';
import { playerInstructions } from './engine/playerInstructions.js';
import { depthChart } from './engine/depth.js';
import { setPiecePlan, captaincy, trainingFocus } from './engine/extras.js';
import { buildAlternatives } from './engine/alternatives.js';

/**
 * @param {string} text  contents of the export file
 * @param {string} filename
 * @param {{roles, formations, columns, tuning, instructions}} docs
 * @param {object} [options]  {excludeInjured, strength (-2..2), alternatives (default true)}
 */
export function analyse(text, filename, docs, options = {}) {
  const table = readExport(text, filename);
  const map = buildHeaderMap(table.headers, docs.columns, table.adapter.aliases);
  const columns = checkColumns(map, docs.columns);
  const base = { filename, source: table.adapter.label, format: table.format, columns };
  if (!table.headers.length || !table.rows.length) {
    return { ...base, ok: false, error: table.warnings[0] || 'The file is empty.' };
  }
  if (columns.fatal) return { ...base, ok: false, error: columns.fatal };
  const players = parsePlayers(table, map, docs.columns, docs.tuning);
  if (players.length < 11) {
    return { ...base, ok: false, error: `Only ${players.length} players were found in the file; at least 11 are needed.` };
  }
  const club = commonClub(players);
  for (const p of players) p.onLoan = isOutOnLoan(p, club);
  const strength = Math.max(-2, Math.min(2, Number(options.strength) || 0));
  const searchOptions = { excludeInjured: options.excludeInjured };
  if (options.excludeInjured === undefined) delete searchOptions.excludeInjured;

  // 1. A first look at the best XI tells us what kind of team this is (the game plan) ...
  const ctx = createContext(players, docs, searchOptions);
  ctx.instructionsDoc = docs.instructions;
  const first = searchSystems(ctx, { polishTop: 0, quick: true });
  if (!first.best) {
    return { ...base, ok: false, error: 'No formation could be filled with the players in this file.' };
  }
  ctx.plan = derivePlan(squadProfile(first.best, ctx), strength, docs.tuning.instructions);

  // 2. ... then every system is scored again, now also on how well it suits that plan.
  const search = searchSystems(ctx);
  const best = search.best;
  const profile = squadProfile(best, ctx);
  const setPieces = setPiecePlan(best, profile, ctx);
  const instructions = decideInstructions(profile, best, ctx, { strength, setPieces });
  const result = {
    ...base,
    ok: true,
    club,
    players,
    ctx,
    search,
    best,
    profile,
    instructions,
    setPieces,
    captain: captaincy(best),
    playerInstructions: playerInstructions(best, profile, instructions, ctx),
    depth: depthChart(best, ctx),
    training: trainingFocus(instructions, profile, best, ctx),
    suitability: suitabilityTable(ctx),
    warnings: [...table.warnings, ...ctx.warnings],
  };
  result.alternatives = options.alternatives === false ? [] : buildAlternatives(result, players, docs, searchOptions);
  return result;
}

/** A player listed at another club, or with "Out On Loan" as playing time, can't be picked. */
function isOutOnLoan(p, club) {
  if (/out on loan/i.test(p.playingTime)) return true;
  return !!(club && p.club && p.club !== club);
}

function commonClub(players) {
  const counts = new Map();
  for (const p of players) if (p.club) counts.set(p.club, (counts.get(p.club) || 0) + 1);
  let best = '';
  let n = 0;
  for (const [club, c] of counts) if (c > n) [best, n] = [club, c];
  return n >= players.length / 2 ? best : '';
}
