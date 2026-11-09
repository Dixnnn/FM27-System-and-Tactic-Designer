// The whole pipeline: export file text -> players -> tactic. Used by the app and by the dev CLI.

import { readExport } from './input/index.js';
import { buildHeaderMap } from './parse/columns.js';
import { parsePlayers } from './parse/player.js';
import { checkColumns } from './parse/validate.js';
import { createContext, searchSystems, suitabilityTable } from './engine/search.js';

/**
 * @param {string} text  contents of the export file
 * @param {string} filename
 * @param {{roles, formations, columns, tuning}} docs
 * @param {object} [options]  e.g. {excludeInjured: false}
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
  const ctx = createContext(players, docs, options);
  const search = searchSystems(ctx);
  if (!search.best) {
    return { ...base, ok: false, error: 'No formation could be filled with the players in this file.' };
  }
  return {
    ...base,
    ok: true,
    club: commonClub(players),
    players,
    ctx,
    search,
    suitability: suitabilityTable(ctx),
    warnings: [...table.warnings, ...ctx.warnings],
  };
}

function commonClub(players) {
  const counts = new Map();
  for (const p of players) if (p.club) counts.set(p.club, (counts.get(p.club) || 0) + 1);
  let best = '';
  let n = 0;
  for (const [club, c] of counts) if (c > n) [best, n] = [club, c];
  return n >= players.length / 2 ? best : '';
}
