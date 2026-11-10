// Alternative tactics: a defensive setup for away games against stronger teams, a front-foot setup for
// home games against weaker teams, and the best system with a different shape.

import { createContext, searchSystems } from './search.js';
import { squadProfile } from './profile.js';
import { decideInstructions, derivePlan } from './instructions.js';
import { setPiecePlan } from './extras.js';

const ORDER = {
  defensiveLine: ['Much Lower', 'Lower', 'Standard', 'Higher', 'Much Higher'],
  mentality: ['Very Defensive', 'Defensive', 'Cautious', 'Balanced', 'Positive', 'Attacking', 'Very Attacking'],
};
const step = (list, value, by) => list[Math.max(0, Math.min(list.length - 1, list.indexOf(value) + by))];
const floorAt = (value, min) => (ORDER.mentality.indexOf(value) < ORDER.mentality.indexOf(min) ? min : value);
const capAt = (value, max) => (ORDER.mentality.indexOf(value) > ORDER.mentality.indexOf(max) ? max : value);

function diffInstructions(main, alt) {
  const out = [];
  if (main.mentality.value !== alt.mentality.value) out.push({ name: 'Mentality', from: main.mentality.value, to: alt.mentality.value, reason: alt.mentality.reason });
  for (const key of ['ip', 'oop']) {
    alt[key].forEach((item, i) => {
      const before = main[key][i];
      if (before.value !== item.value) out.push({ name: item.name, from: before.value, to: item.value, reason: item.reason });
    });
  }
  return out;
}

function roleChanges(main, alt) {
  const byPlayer = new Map(main.lanes.map((l) => [l.player, l]));
  return alt.lanes.map((l) => {
    const m = byPlayer.get(l.player);
    return { lane: l, before: m || null, changed: !m || m.ipRole.id !== l.ipRole.id || m.oopRole.id !== l.oopRole.id || m.ip !== l.ip || m.oop !== l.oop };
  });
}

function shapeKey(sys) {
  const backs = sys.ipSlots.filter((s) => /^D/.test(s) && !/^DM/.test(s)).length;
  const strikers = sys.ipSlots.filter((s) => /^ST/.test(s)).length;
  return `${backs}-${strikers}`;
}

/**
 * @param {{best, profile, instructions, search}} main  the main tactic
 * @param {object} players
 * @param {object} docs
 * @param {object} options  analyse() options
 */
export function buildAlternatives(main, players, docs, options) {
  const cfg = docs.tuning.instructions;
  const alts = [];
  const strength = main.instructions.strength;

  const run = (title, when, searchOptions, planOverride, strengthFor, situation, tweak) => {
    const ctx = createContext(players, docs, { ...options, ...searchOptions, polishTop: 3 });
    ctx.instructionsDoc = docs.instructions;
    ctx.plan = derivePlan(main.profile, strengthFor, cfg, planOverride);
    const search = searchSystems(ctx);
    if (!search.best) return;
    const profile = squadProfile(search.best, ctx);
    const setPieces = setPiecePlan(search.best, profile, ctx);
    const base = decideInstructions(profile, search.best, ctx, { strength: strengthFor, setPieces, planOverride, situation });
    const { overrides, mentality, mentalityReason, extraReasons } = tweak(base);
    const instructions = decideInstructions(profile, search.best, ctx, { strength: strengthFor, setPieces, planOverride, situation, overrides, mentality, mentalityReason, extraReasons });
    const diffs = diffInstructions(main.instructions, instructions);
    const roles = roleChanges(main.best, search.best);
    const sameShape = search.best.ipName === main.best.ipName && search.best.oopName === main.best.oopName;
    const similar = sameShape && diffs.length <= 2 && !roles.some((r) => r.changed);
    alts.push({ title, when, system: search.best, profile, instructions, diffs, roles, ctx, similar });
  };

  // 1. Away against stronger teams: weight defending more, sit deeper, break quickly.
  run(
    'Away against stronger teams',
    'Use when you expect less of the ball: away days and games against better sides.',
    { ipWeight: 0.4, oopWeight: 0.6 },
    { lineOfEngagement: 'Low Block', attackingTransition: 'Counter-Attack', pressCorrected: false },
    Math.min(strength, 0) - 1,
    'Against stronger opponents you will have less of the ball.',
    (base) => ({
      mentality: floorAt(step(ORDER.mentality, main.instructions.mentality.value, -2), 'Defensive'),
      mentalityReason: 'Two steps more careful than the main tactic: protect your goal first and hit them on the break.',
      overrides: {
        defensiveLine: step(ORDER.defensiveLine, base.values.defensiveLine, -1),
        defensiveTransition: 'Regroup',
        gkDistributionSpeed: 'Distribute Quickly',
        timeWasting: 'More Often',
        triggerPress: base.values.triggerPress.includes('More') ? 'Standard' : base.values.triggerPress,
      },
      extraReasons: {
        defensiveLine: 'One step deeper than usual, so faster opponents have less space to run into.',
        defensiveTransition: 'Get back into shape rather than press a better team on the ball.',
        gkDistributionSpeed: 'Start counter-attacks before they recover.',
        timeWasting: 'Run the clock down when you are ahead.',
        triggerPress: 'Save energy for counter-attacks.',
      },
    }),
  );

  // 2. Home against weaker teams: weight attacking more, push up and keep the ball.
  const canPress = (main.profile.metrics.pressing?.delta ?? 0) >= -0.3 && (main.profile.metrics.cbPace?.delta ?? 0) >= -1;
  run(
    'At home against weaker teams',
    'Use when you expect to have most of the ball and the opponent sits deep.',
    { ipWeight: 0.6, oopWeight: 0.4 },
    { lineOfEngagement: canPress ? 'High Press' : 'Mid Block', attackingTransition: 'Standard', pressCorrected: false },
    Math.max(strength, 0) + 1,
    'Against weaker opponents you will want to win the ball back quickly and keep it.',
    (base) => ({
      mentality: capAt(step(ORDER.mentality, main.instructions.mentality.value, 1), 'Attacking'),
      mentalityReason: 'One step more attacking than the main tactic: weaker sides sit deep, so commit more players forward.',
      overrides: { patience: 'Work Ball Into Box', timeWasting: 'Less Often' },
      extraReasons: {
        patience: 'Deep defences leave little space: be patient and work the ball into the box.',
        timeWasting: 'You want the game played at your pace and the ball in play.',
      },
    }),
  );

  // 3. Your future stars starting, if the main tactic leaves some of them out.
  const future = players.filter((p) => p.label === 'future' && !p.onLoan);
  const starting = new Set(main.best.lanes.map((l) => l.player));
  const lockedCount = players.filter((p) => !p.onLoan && (p.mustStart || p.label === 'marquee')).length;
  if (future.some((p) => !starting.has(p)) && future.length + lockedCount <= 11) {
    run(
      'With your future stars starting',
      `Use to give your future stars (${future.map((p) => p.name.split(/\s+/).pop()).join(', ')}) minutes: cup games, dead rubbers or a development season.`,
      { extraLocks: future.map((p) => p.id) },
      {},
      strength,
      '',
      () => ({}),
    );
  }

  // 4. The best system with a different shape (back line or number of strikers).
  const mainKey = shapeKey(main.best);
  const other = main.search.ranking.find((s) => shapeKey(s) !== mainKey);
  if (other) {
    const ctx = main.ctx;
    const profile = squadProfile(other, ctx);
    const setPieces = setPiecePlan(other, profile, ctx);
    const instructions = decideInstructions(profile, other, ctx, { strength, setPieces });
    alts.push({
      title: `Different shape: ${other.ipName}`,
      when: `The best-scoring system with a different shape (${(main.best.score - other.score).toFixed(1)} points behind the main tactic). Useful as a Plan B or to change things during a match.`,
      system: other,
      profile,
      instructions,
      diffs: diffInstructions(main.instructions, instructions),
      roles: roleChanges(main.best, other),
      ctx,
    });
  }
  return alts;
}
