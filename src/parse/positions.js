// FM position strings ("D/WB (R), DM, AM (RLC)") -> a set of single positions ("D (R)", "WB (R)", "DM", ...),
// and how familiar a player is with a position. FM27 shows familiarity only as coloured dots, which no
// export contains, so the tool infers it: Best Pos = Natural, listed positions = Accomplished,
// neighbouring positions = Competent/Unconvincing (from tuning.json), anything else = Awkward.

export const ALL_POSITIONS = [
  'GK', 'D (L)', 'D (C)', 'D (R)', 'WB (L)', 'WB (R)', 'DM',
  'M (L)', 'M (C)', 'M (R)', 'AM (L)', 'AM (C)', 'AM (R)', 'ST (C)',
];

const SIDED = new Set(['D', 'WB', 'M', 'AM', 'ST']);

/** "D/WB (RL), DM, ST (C)" -> Set{"D (R)","D (L)","WB (R)","WB (L)","DM","ST (C)"} */
export function parsePositions(text) {
  const out = new Set();
  if (!text) return out;
  const chunks = String(text)
    .replace(/[–—]/g, '-')
    .split(/,|;|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const chunk of chunks) {
    const m = /^([A-Za-z/ ]+?)\s*(?:\(([RLCrlc ]+)\))?$/.exec(chunk);
    if (!m) continue;
    const bases = m[1].toUpperCase().split('/').map((b) => b.trim()).filter(Boolean);
    const sides = (m[2] || '').toUpperCase().replace(/\s/g, '').split('').filter(Boolean);
    for (let base of bases) {
      if (base === 'GK' || base === 'DM') {
        out.add(base);
        continue;
      }
      if (base === 'S' || base === 'F' || base === 'FC') base = 'ST';
      if (base === 'WB' && !sides.length) {
        out.add('WB (L)');
        out.add('WB (R)');
        continue;
      }
      if (!SIDED.has(base)) continue;
      const useSides = sides.length ? sides : ['C'];
      for (const s of useSides) {
        if (base === 'ST') out.add('ST (C)');
        else if (base === 'WB' && s === 'C') continue;
        else out.add(`${base} (${s})`);
      }
    }
  }
  return out;
}

/** Build a lookup {posA: {posB: level}} from tuning.familiarity.adjacent. */
export function buildAdjacency(tuning) {
  const adj = {};
  for (const [a, b, level] of tuning.familiarity.adjacent) {
    (adj[a] ||= {})[b] = level;
    (adj[b] ||= {})[a] = level;
  }
  return adj;
}

const ORDER = ['Natural', 'Accomplished', 'Competent', 'Unconvincing', 'Awkward'];

/**
 * Familiarity level of a player with an FM position.
 * @param {{positions:Set<string>, bestPos:Set<string>}} player
 */
export function familiarity(player, position, adjacency) {
  if (player.bestPos.has(position)) return 'Natural';
  if (player.positions.has(position)) return player.bestPos.size ? 'Accomplished' : 'Natural';
  if (position === 'GK' || player.positions.has('GK')) return 'Awkward';
  let best = 'Awkward';
  for (const p of player.positions) {
    const level = adjacency[p]?.[position];
    if (level && ORDER.indexOf(level) < ORDER.indexOf(best)) best = level;
  }
  return best;
}
