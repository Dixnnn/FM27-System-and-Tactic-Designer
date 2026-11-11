// Progress over time: compare your squad now with earlier exports of the same club. Who improved, who
// declined, who arrived and left, and how the first team's level moved from read to read.

import { generalLevel } from './profile.js';

const sameAs = (a, b) => (a.uid && b.uid ? a.uid === b.uid : a.name === b.name);
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/** "squad_20261110_180852.csv" -> Date, or null. */
export function dateFromName(name) {
  const m = /(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/.exec(name || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
}

/** First-team level: the mean general level of the 18 best players at the club (not on loan). */
function firstTeamLevel(players) {
  const levels = players.filter((p) => !p.onLoan).map(generalLevel).filter((v) => v != null).sort((a, b) => b - a);
  return mean(levels.slice(0, 18));
}

/** Attribute changes between two reads of the same player (exact values only, not scouting ranges). */
function attrChanges(now, before) {
  const out = [];
  for (const [a, v] of Object.entries(now.attrs)) {
    const b = before.attrs[a];
    if (!v || !b || v.range || b.range) continue;
    if (v.v !== b.v) out.push({ attr: a, from: b.v, to: v.v, delta: v.v - b.v });
  }
  return out.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta) || x.attr.localeCompare(y.attr));
}

/**
 * @param {object} result  analyse() result for the squad now
 * @param {Array<{name:string, exportedAt?:string, players:object[], club?:string}>} earlier  older reads
 */
export function progress(result, earlier) {
  const club = result.club;
  const reads = earlier
    .map((e) => ({ ...e, date: e.exportedAt ? new Date(e.exportedAt) : dateFromName(e.name) }))
    .filter((e) => !club || !e.club || e.club === club)
    .filter((e) => e.players?.length);
  const nowDate = result.exportedAt ? new Date(result.exportedAt) : dateFromName(result.filename) || new Date();
  reads.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
  const usable = reads.filter((e) => !e.date || e.date < nowDate);
  if (!usable.length) return { ok: false, skipped: earlier.length - reads.length };
  // Players in older exports have no loan flag yet: same rule as for the squad (listed at another club).
  for (const e of usable) for (const p of e.players) p.onLoan = /out on loan/i.test(p.playingTime) || !!(club && p.club && p.club !== club);

  const previous = usable[usable.length - 1];
  const now = result.players;
  const players = now
    .map((p) => {
      const before = previous.players.find((q) => sameAs(p, q));
      if (!before) return null;
      const changes = attrChanges(p, before);
      const gNow = generalLevel(p);
      const gBefore = generalLevel(before);
      return {
        player: p,
        changes,
        up: changes.filter((c) => c.delta > 0).reduce((s, c) => s + c.delta, 0),
        down: changes.filter((c) => c.delta < 0).reduce((s, c) => s + c.delta, 0),
        levelDelta: gNow != null && gBefore != null ? gNow - gBefore : null,
        abilityDelta: p.ability != null && before.ability != null ? p.ability - before.ability : null,
        potentialDelta: p.potential != null && before.potential != null ? p.potential - before.potential : null,
      };
    })
    .filter(Boolean);
  const improvers = players.filter((x) => x.up + x.down > 0).sort((a, b) => b.up + b.down - (a.up + a.down)).slice(0, 10);
  const decliners = players.filter((x) => x.up + x.down < 0).sort((a, b) => a.up + a.down - (b.up + b.down)).slice(0, 6);
  const arrivals = now.filter((p) => !previous.players.some((q) => sameAs(p, q)));
  const departures = previous.players.filter((q) => !now.some((p) => sameAs(p, q)));
  const trend = [
    ...usable.map((e) => ({ date: e.date, name: e.name, level: firstTeamLevel(e.players) })),
    { date: nowDate, name: result.filename, level: firstTeamLevel(now), now: true },
  ].filter((t) => t.level != null);
  return {
    ok: true,
    previous: { name: previous.name, date: previous.date },
    reads: usable.length,
    skipped: earlier.length - usable.length,
    trend,
    improvers,
    decliners,
    arrivals,
    departures,
    unchanged: players.filter((x) => !x.changes.length).length,
    compared: players.length,
  };
}
