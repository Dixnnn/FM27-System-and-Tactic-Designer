// Set pieces, aerial targets, captaincy and training focus for the chosen XI.

import { generalLevel } from './profile.js';

const val = (p, a) => p.attrs[a]?.v ?? null;

function weighted(p, weights) {
  let s = 0;
  let w = 0;
  for (const [a, k] of Object.entries(weights)) {
    const v = val(p, a);
    if (v == null) continue;
    s += v * k;
    w += k;
  }
  return w ? s / w : null;
}

function ranked(players, weights, extra = () => 0) {
  return players
    .map((p) => ({ player: p, score: weighted(p, weights) }))
    .filter((x) => x.score != null)
    .map((x) => ({ ...x, score: x.score + extra(x.player) }))
    .sort((a, b) => b.score - a.score);
}

const footWord = (p) => (p.leftFoot != null && p.rightFoot != null ? (p.leftFoot > p.rightFoot ? 'left-footed' : p.rightFoot > p.leftFoot ? 'right-footed' : 'two-footed') : '');

/**
 * Set-piece takers and targets from the starting XI.
 */
export function setPiecePlan(system, profile, ctx) {
  const xi = system.lanes.map((l) => l.player);
  const outfield = system.lanes.filter((l) => l.ip !== 'GK').map((l) => l.player);
  const corners = ranked(outfield, { Corners: 0.6, Technique: 0.2, Crossing: 0.2 });
  const directFK = ranked(outfield, { 'Free Kick Taking': 0.5, Technique: 0.2, 'Long Shots': 0.2, Composure: 0.1 });
  const indirectFK = ranked(outfield, { 'Free Kick Taking': 0.4, Crossing: 0.4, Technique: 0.2 });
  const penalties = ranked(outfield, { 'Penalty Taking': 0.6, Composure: 0.3, Finishing: 0.1 });
  const longThrows = ranked(outfield, { 'Long Throws': 1 });
  const aerial = ranked(outfield, { Heading: 1, 'Jumping Reach': 1, Strength: 0.5, Bravery: 0.5 }, (p) =>
    p.heightCm ? Math.max(-2, Math.min(3, (p.heightCm - 182) / 4)) : 0,
  );
  const level = profile.level ?? 10;
  const aerialTargets = aerial.slice(0, 4).map((x) => ({ name: x.player.name, player: x.player, score: x.score, delta: x.score - level, height: x.player.heightCm }));
  const targetSet = new Set(aerialTargets.slice(0, 3).map((t) => t.player));
  const defensive = system.lanes
    .filter((l) => ['D (C)', 'D (L)', 'D (R)', 'WB (L)', 'WB (R)', 'DM'].includes(ctx.slots[l.oop][2]))
    .map((l) => l.player)
    .filter((p) => !targetSet.has(p));
  const stayBack = ranked(defensive, { Pace: 1, Acceleration: 1, Positioning: 0.7, Anticipation: 0.7 }).slice(0, 2);

  // Takers should not be the players you want attacking the ball, unless nobody else is close.
  const preferNonTargets = (list) => {
    const others = list.filter((x) => !targetSet.has(x.player));
    return others.length && list.length && others[0].score >= list[0].score - 1.5 ? others.concat(list.filter((x) => targetSet.has(x.player))) : list;
  };
  const cornerList = preferNonTargets(corners);
  // Corners: an inswinger from each side comes from the foot opposite that side.
  const cornerFor = (side) => {
    const prefersRightFoot = side === 'left';
    const pool = cornerList.slice(0, 3);
    const match = pool.find((x) => (prefersRightFoot ? x.player.rightFoot >= x.player.leftFoot : x.player.leftFoot >= x.player.rightFoot));
    return match || pool[0];
  };
  const take = (x) => (x ? { name: x.player.name, player: x.player, foot: footWord(x.player) } : null);
  const best = cornerList[0];
  return {
    cornersLeft: take(cornerFor('left')),
    cornersRight: take(cornerFor('right')),
    directFreeKicks: take(directFK[0]),
    indirectFreeKicks: take(preferNonTargets(indirectFK)[0]),
    penalties: penalties.slice(0, 5).map(take),
    longThrows: longThrows[0] && val(longThrows[0].player, 'Long Throws') >= Math.max(13, level + 2) ? take(longThrows[0]) : null,
    aerialTargets,
    stayBack: stayBack.map(take),
    cornerTaker: best ? { name: best.player.name, corners: val(best.player, 'Corners'), value: best.score } : null,
    goalkeeper: xi.find((p, i) => system.lanes[i].ip === 'GK'),
  };
}

const PERSONALITY_BONUS = {
  'born leader': 4, leader: 3, 'model citizen': 3, 'model professional': 2.5, resolute: 2, 'iron willed': 1.5,
  professional: 1.5, determined: 1.5, 'fairly professional': 0.5, 'fairly determined': 0.5, driven: 1, perfectionist: 1,
  spirited: 0.5, unambitious: -1, casual: -1.5, 'low self-belief': -1.5, 'easily discouraged': -1.5,
  temperamental: -2, fickle: -2, mercenary: -1, 'low determination': -2, slack: -2,
};

/** Captain and vice-captain from the starting XI. */
export function captaincy(system) {
  const scored = system.lanes
    .map((l) => l.player)
    .map((p) => {
      const pers = PERSONALITY_BONUS[(p.personality || '').toLowerCase()] ?? 0;
      const media = /volatile|confrontational/i.test(p.mediaHandling || '') ? -0.5 : 0;
      const age = p.age == null ? 0 : p.age >= 27 ? 1.5 : p.age >= 24 ? 1 : p.age <= 19 ? -1.5 : p.age <= 21 ? -0.5 : 0;
      const base = (val(p, 'Leadership') ?? 10) * 2 + (val(p, 'Determination') ?? 10) + 0.5 * (val(p, 'Teamwork') ?? 10) + 0.5 * (val(p, 'Composure') ?? 10);
      return { player: p, score: base + 2 * pers + media + age, pers };
    })
    .sort((a, b) => b.score - a.score);
  const why = (x) => {
    const bits = [`Leadership ${val(x.player, 'Leadership') ?? '–'}`, `Determination ${val(x.player, 'Determination') ?? '–'}`];
    if (x.player.personality) bits.push(`personality: ${x.player.personality}`);
    if (x.player.age != null) bits.push(`age ${x.player.age}`);
    return bits.join(', ');
  };
  return {
    captain: scored[0] ? { name: scored[0].player.name, player: scored[0].player, why: why(scored[0]) } : null,
    vice: scored[1] ? { name: scored[1].player.name, player: scored[1].player, why: why(scored[1]) } : null,
  };
}

// Mental attributes that training focus barely moves (they change with age, personality and mentoring).
const HARD_TO_TRAIN = new Set(['Aggression', 'Bravery', 'Determination', 'Flair', 'Leadership', 'Natural Fitness']);

/** Training sessions that teach this tactic, and an individual focus per starter. */
export function trainingFocus(instructions, profile, system, ctx) {
  const v = instructions.values;
  const team = [];
  const add = (session, why) => team.push({ session, why });
  add('In Possession Shape', `Teaches the ${system.ipName} shape and roles.`);
  add('Out Of Possession Shape', `Teaches the ${system.oopName} shape and roles.`);
  if (v.lineOfEngagement !== 'Mid Block') add('Line of Engagement', `You use ${v.lineOfEngagement}.`);
  if (v.triggerPress !== 'Standard') add('Pressing Intensity', `Trigger Press is set to ${v.triggerPress}.`);
  if (v.pressingTrap !== 'Balanced') add('Pressing Trap', `You use ${v.pressingTrap}.`);
  if (v.buildUpStrategy !== 'Balanced') add('Build Up', `You ${v.buildUpStrategy === 'Play Through Press' ? 'play through the press' : 'bypass the press'}.`);
  if (v.passingDirectness !== 'Standard') add('Passing Style', `Passing Directness is ${v.passingDirectness}.`);
  if (v.patience !== 'Standard' || v.crossingStyle !== 'Balanced' || v.shotsFromDistance !== 'Balanced') add('Chance Creation', 'You changed how chances are created.');
  const prep = [];
  if (v.lineOfEngagement === 'High Press') prep.push({ session: 'Defensive Engagement', why: 'Sharpens the press before matches.' });
  else if (v.lineOfEngagement === 'Low Block') prep.push({ session: 'Defensive Block', why: 'Keeps the low block compact.' });
  else prep.push({ session: 'Defensive Positioning', why: 'Keeps the mid block organised.' });
  if (v.buildUpStrategy === 'Play Through Press') prep.push({ session: 'Press Avoidance', why: 'Helps play out against teams that press you.' });
  if (v.playForSetPieces === 'Play for Set Pieces') prep.push({ session: 'Corners', why: 'Set pieces are part of the plan.' }, { session: 'Free Kicks', why: 'Set pieces are part of the plan.' });
  const physical =
    (v.lineOfEngagement === 'High Press' || /More Often/.test(v.triggerPress)) && (profile.metrics.stamina?.delta ?? 0) < 0
      ? 'Stamina is below your team level and the tactic presses a lot: keep regular physical sessions in the schedule.'
      : null;

  const individual = system.lanes.map((l) => {
    const p = l.player;
    const keys = [...new Set([...l.ipRole.key, ...l.oopRole.key])].filter((a) => p.attrs[a] && !HARD_TO_TRAIN.has(a));
    const avg = keys.reduce((s, a) => s + p.attrs[a].v, 0) / Math.max(1, keys.length);
    const weakest = keys
      .map((a) => ({ attr: a, value: p.attrs[a].v }))
      .sort((a, b) => a.value - b.value)
      .filter((x) => x.value <= avg - 1)
      .slice(0, 2);
    let note = '';
    if (p.age != null && p.age >= 31 && weakest.some((w) => ['Pace', 'Acceleration', 'Stamina', 'Agility'].includes(w.attr))) {
      note = 'At his age physical attributes rarely improve; focus on the technical or mental one.';
    } else if (p.age != null && p.age <= 21) note = 'Young enough to improve quickly.';
    return { player: p, role: `${l.ipRole.name} / ${l.oopRole.name}`, weakest, note, general: generalLevel(p) };
  });
  return { team, prep, physical, individual };
}
