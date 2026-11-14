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
import { applyPicks, checkPicks, hasPicks, picksSummary, futureStarPlans } from './engine/picks.js';
import { recruitment } from './engine/recruitment.js';
import { progress } from './engine/progress.js';
import { interpretIdea, ideaSearchOptions, applyIdeaToResult } from './engine/idea.js';
import { generalLevel } from './engine/profile.js';

/**
 * @param {string} text  contents of the export file
 * @param {string} filename
 * @param {{roles, formations, columns, tuning, instructions}} docs
 * @param {object} [options]  {excludeInjured, strength (-2..2), alternatives (default true),
 *   picks: {playerKey: {start, label, out}} or a function(club) returning that,
 *   formation: {ip, oop} (formation names; null = the tool chooses) or a function(club) returning that,
 *   exportedAt: when the squad was read (ISO text), scouting: {name, text} a shortlist or player search to compare,
 *   history: [{name, text, exportedAt}] earlier squad exports to compare with,
 *   idea: {text, intensity (0 Normal .. 3 Extreme)} your idea for the tactic, or a function(club) returning that}
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
  const picks = typeof options.picks === 'function' ? options.picks(club) : options.picks;
  const { ignored } = applyPicks(players, picks || {});
  const problems = checkPicks(players);
  if (problems.length) return { ...base, ok: false, pickError: true, club, players, error: `Your picks can't all start: ${problems.join(' ')}` };
  const strength = Math.max(-2, Math.min(2, Number(options.strength) || 0));
  const searchOptions = { excludeInjured: options.excludeInjured };
  if (options.excludeInjured === undefined) delete searchOptions.excludeInjured;
  // Your own formation (in possession, out of possession or both); unknown names are ignored with a note.
  const notes = [];
  const wanted = (typeof options.formation === 'function' ? options.formation(club) : options.formation) || {};
  for (const [key, list, label] of [['ip', docs.formations.inPossession, 'in-possession'], ['oop', docs.formations.outOfPossession, 'out-of-possession']]) {
    if (!wanted[key]) continue;
    if (list.some((f) => f.name === wanted[key])) searchOptions[key === 'ip' ? 'forceIp' : 'forceOop'] = wanted[key];
    else notes.push(`The ${label} formation "${wanted[key]}" isn't in this version's list, so the tool chose one.`);
  }
  const forced = !!(searchOptions.forceIp || searchOptions.forceOop);
  // Your idea ("Lindqvist scores headers"): read it, then turn it into nudges for the search.
  const ideaInput = (typeof options.idea === 'function' ? options.idea(club) : options.idea) || null;
  let idea = null;
  if (ideaInput?.text?.trim()) {
    const levels = players.filter((p) => !p.onLoan && !p.isGoalkeeper).map(generalLevel).filter((v) => v != null).sort((a, b) => b - a).slice(0, 18);
    const teamLevel = levels.length ? levels.reduce((s, v) => s + v, 0) / levels.length : 11;
    idea = interpretIdea(ideaInput.text, players, ideaInput.intensity, { level: teamLevel });
  }
  const useIdea = !!idea && !idea.empty;
  const ideaOptions = useIdea ? ideaSearchOptions(idea) : {};

  // 1. A first look at the best XI tells us what kind of team this is (the game plan) ...
  const ctx = createContext(players, docs, { ...searchOptions, ...ideaOptions });
  ctx.instructionsDoc = docs.instructions;
  let first = searchSystems(ctx, { polishTop: 0, quick: !forced });
  if (!first.best && ctx.locked.size) first = searchSystems(ctx, { polishTop: 0 });
  if (!first.best && forced) {
    const pair = [searchOptions.forceIp && `${searchOptions.forceIp} in possession`, searchOptions.forceOop && `${searchOptions.forceOop} out of possession`].filter(Boolean).join(' with ');
    return {
      ...base, ok: false, formationError: true, club, players,
      error: `${pair} can't be used: ${searchOptions.forceIp && searchOptions.forceOop ? 'players would have to move too far between the two shapes, or ' : ''}no eleven of your players can fill it${ctx.locked.size ? ' together with your picks' : ''}. Choose another formation, or let the tool choose.`,
    };
  }
  if (!first.best) {
    if (ctx.locked.size) {
      const names = [...ctx.locked].map((p) => `${p.name} (${p.positionsText || [...p.positions].join(', ')})`).join(', ');
      return { ...base, ok: false, pickError: true, club, players, error: `No formation fits all the players you marked to start: ${names}. Unmark one or two and try again.` };
    }
    return { ...base, ok: false, error: 'No formation could be filled with the players in this file.' };
  }
  const basePlan = derivePlan(squadProfile(first.best, ctx), strength, docs.tuning.instructions);
  ctx.plan = useIdea ? { ...basePlan, ...idea.planOverride } : basePlan;

  // 2. ... then every system is scored again, now also on how well it suits that plan.
  const search = searchSystems(ctx);
  const best = search.best;
  const profile = squadProfile(best, ctx);
  const setPieces = setPiecePlan(best, profile, ctx);
  let instructions = decideInstructions(profile, best, ctx, { strength, setPieces });
  if (useIdea) {
    // The idea's team instructions and mentality go on top (only real FM27 options are used).
    const options = Object.fromEntries([...docs.instructions.inPossession, ...docs.instructions.outOfPossession].map((i) => [i.id, i.options]));
    const overrides = Object.fromEntries(Object.entries(idea.overrides).filter(([id, v]) => options[id]?.includes(v)));
    const order = docs.instructions.mentalities;
    const shifted = order[Math.max(0, Math.min(order.length - 1, order.indexOf(instructions.mentality.value) + idea.mentalityDelta))];
    instructions = decideInstructions(profile, best, ctx, {
      strength, setPieces, planOverride: idea.planOverride, overrides, extraReasons: idea.reasons,
      ...(idea.mentalityDelta ? { mentality: shifted, mentalityReason: `Your idea: ${idea.mentalityReasons.join(' ')}` } : {}),
    });
  }
  // With picks, also find the tactic the tool would choose freely, to show what the picks cost.
  let freeChoice = null;
  if (hasPicks(players)) {
    const free = createContext(players, docs, { ...searchOptions, ignorePicks: true });
    free.plan = ctx.plan;
    const fs = searchSystems(free, { polishTop: 2 });
    if (fs.best) {
      const inPicked = new Set(best.lanes.map((l) => l.player));
      const inFree = new Set(fs.best.lanes.map((l) => l.player));
      freeChoice = {
        system: fs.best,
        fitCost: fs.best.fit - best.fit,
        benched: [...inFree].filter((p) => !inPicked.has(p)),
        added: [...inPicked].filter((p) => !inFree.has(p)),
      };
    }
  }
  // With your idea, also build the tactic without it, to show what the idea costs in team fit.
  let ideaChoice = null;
  if (useIdea) {
    const plain = createContext(players, docs, searchOptions);
    plain.plan = basePlan;
    const ps = searchSystems(plain, { polishTop: 2 });
    ideaChoice = ps.best ? { auto: ps.best, fitCost: ps.best.fit - best.fit } : null;
  }
  // With your own formation, also find the tool's own choice, to show what the formation costs.
  let formationChoice = null;
  if (forced) {
    const auto = createContext(players, docs, { ...searchOptions, forceIp: null, forceOop: null });
    auto.plan = ctx.plan;
    const as = searchSystems(auto, { polishTop: 2 });
    formationChoice = { ip: searchOptions.forceIp || null, oop: searchOptions.forceOop || null, auto: as.best, fitCost: as.best ? as.best.score - best.score : 0 };
  }
  const result = {
    ...base,
    ok: true,
    formationChoice,
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
    freeChoice,
    warnings: [...table.warnings, ...notes, ...ctx.warnings],
  };
  result.picks = { summary: picksSummary(result), futureStars: futureStarPlans(result), ignored };
  if (idea) {
    const done = useIdea ? applyIdeaToResult(result, idea) : [];
    result.idea = {
      text: idea.text, intensity: idea.intensity, intensityLabel: idea.intensityLabel, empty: idea.empty,
      understood: idea.understood, ignored: idea.ignored, ambiguous: idea.ambiguous, notes: idea.notes, actions: idea.actions,
      done, choice: ideaChoice, overrides: idea.overrides,
    };
  }
  result.alternatives = options.alternatives === false ? [] : buildAlternatives(result, players, docs, searchOptions);
  result.exportedAt = options.exportedAt || null;
  if (options.scouting?.text) {
    const sc = readPlayers(options.scouting.text, options.scouting.name || 'shortlist.csv', docs);
    result.scouting = sc.ok
      ? { name: options.scouting.name, attributesFound: sc.attributesFound, attributesTotal: sc.attributesTotal, ...recruitment(result, sc.players) }
      : { name: options.scouting.name, error: sc.error };
  }
  if (options.history?.length) {
    const earlier = options.history
      .map((h) => {
        const r = readPlayers(h.text, h.name, docs);
        return r.ok ? { name: h.name, exportedAt: h.exportedAt, players: r.players, club: r.club } : null;
      })
      .filter(Boolean);
    result.progress = progress(result, earlier);
  }
  return result;
}

/**
 * Read another export (a shortlist, a player search, or an older squad export) into players, without
 * building a tactic. Used by the recruitment helper and the progress comparison.
 * @returns {{ok:boolean, players?:object[], club?:string, error?:string, attributesFound?:number}}
 */
export function readPlayers(text, filename, docs) {
  const table = readExport(text, filename);
  const map = buildHeaderMap(table.headers, docs.columns, table.adapter.aliases);
  const columns = checkColumns(map, docs.columns);
  if (!table.headers.length || !table.rows.length) return { ok: false, error: table.warnings[0] || 'The file is empty.' };
  if (columns.fatal) return { ok: false, error: columns.fatal };
  const players = parsePlayers(table, map, docs.columns, docs.tuning);
  return { ok: true, players, club: commonClub(players), attributesFound: columns.attributesFound, attributesTotal: columns.attributesTotal };
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
