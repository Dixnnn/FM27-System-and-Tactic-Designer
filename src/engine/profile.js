// Squad profile of the chosen eleven. Every measure is an average of attributes (1-20) over one unit
// (centre-backs, front line, ...), compared with the team's general level. Comparing with the team's own
// level, not fixed numbers, makes the advice work at any level: a League Two side and a Champions League
// side are judged against opponents of their own standard.

const SET_PIECE_AND_HIDDEN = new Set(['Corners', 'Free Kick Taking', 'Long Throws', 'Penalty Taking', 'Natural Fitness', 'Leadership', 'Determination']);
const GK_ONLY = new Set(['Aerial Reach', 'Command of Area', 'Communication', 'Eccentricity', 'Handling', 'Kicking', 'One on Ones', 'Punching (Tendency)', 'Reflexes', 'Rushing Out (Tendency)', 'Throwing']);

/** Mean of a player's outfield attributes: a rough "general level". */
export function generalLevel(player) {
  let sum = 0;
  let n = 0;
  for (const [name, a] of Object.entries(player.attrs)) {
    if (!a || GK_ONLY.has(name) || SET_PIECE_AND_HIDDEN.has(name)) continue;
    sum += a.v;
    n++;
  }
  return n ? sum / n : null;
}

export function attrAvg(players, attrs) {
  let sum = 0;
  let n = 0;
  for (const p of players) {
    for (const a of attrs) {
      const v = p.attrs[a];
      if (v) {
        sum += v.v;
        n++;
      }
    }
  }
  return n ? sum / n : null;
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// key, label (used in sentences and the profile table), group of players, attributes
export const METRICS = [
  ['pace', 'Pace and acceleration', 'outfield', ['Pace', 'Acceleration']],
  ['stamina', 'Stamina', 'outfield', ['Stamina', 'Natural Fitness']],
  ['workRate', 'Work rate and teamwork', 'outfield', ['Work Rate', 'Teamwork']],
  ['pressing', 'Pressing (work rate, stamina, aggression, acceleration, teamwork, anticipation)', 'pressers', ['Work Rate', 'Stamina', 'Aggression', 'Acceleration', 'Teamwork', 'Anticipation']],
  ['aggression', 'Aggression and bravery', 'outfield', ['Aggression', 'Bravery']],
  ['passing', 'Passing and vision', 'outfield', ['Passing', 'Vision']],
  ['technique', 'Technique and first touch', 'outfield', ['Technique', 'First Touch']],
  ['composure', 'Composure and decisions', 'outfield', ['Composure', 'Decisions']],
  ['buildUp', 'Playing out from the back (centre-backs and holding midfielders)', 'buildUp', ['Passing', 'Composure', 'First Touch', 'Technique', 'Decisions', 'Vision']],
  ['creativity', 'Midfield creativity (vision, passing, flair, technique)', 'centralIP', ['Vision', 'Passing', 'Flair', 'Technique']],
  ['cbPace', "Centre-backs' pace and acceleration", 'cbs', ['Pace', 'Acceleration']],
  ['cbAerial', "Centre-backs' heading, jumping and strength", 'cbs', ['Heading', 'Jumping Reach', 'Strength']],
  ['cbReading', "Centre-backs' reading of the game", 'cbs', ['Anticipation', 'Positioning', 'Concentration', 'Decisions']],
  ['tackling', 'Tackling and marking', 'defensive', ['Tackling', 'Marking']],
  ['wideDefending', 'Defending by the wide players', 'wideOOP', ['Tackling', 'Marking', 'Work Rate', 'Acceleration']],
  ['centralDefending', 'Defending in the middle', 'centralOOP', ['Tackling', 'Marking', 'Positioning', 'Strength']],
  ['fwdPace', "Front line's pace and acceleration", 'front', ['Pace', 'Acceleration']],
  ['fwdMovement', "Front line's movement (off the ball, anticipation)", 'front', ['Off the Ball', 'Anticipation']],
  ['finishing', "Front line's finishing and composure", 'front', ['Finishing', 'Composure']],
  ['dribbling', "Attackers' dribbling, flair and agility", 'attackers', ['Dribbling', 'Flair', 'Agility']],
  ['crossing', "Wide players' crossing", 'wideIP', ['Crossing']],
  ['aerialAttack', "Strikers' heading, jumping, strength and bravery", 'strikers', ['Heading', 'Jumping Reach', 'Strength', 'Bravery']],
  ['longShots', "Midfielders' long shots", 'shooters', ['Long Shots']],
  ['gkSweeping', "Goalkeeper's sweeping (rushing out, one on ones, acceleration)", 'gk', ['Rushing Out (Tendency)', 'One on Ones', 'Acceleration', 'Anticipation']],
  ['gkDistribution', "Goalkeeper's distribution (kicking, passing, composure)", 'gk', ['Kicking', 'Passing', 'Composure', 'Decisions']],
  ['gkAerial', "Goalkeeper's aerial reach and command of area", 'gk', ['Aerial Reach', 'Command of Area']],
];

/**
 * @param {object} system  a result of evaluateSystem (lanes with players, roles and slots)
 * @param {object} ctx  search context
 */
export function squadProfile(system, ctx) {
  const lanes = system.lanes;
  const pos = (code) => ctx.slots[code][2];
  const x = (code) => ctx.slots[code][0];
  const pick = (pred) => lanes.filter(pred).map((l) => l.player);
  const groups = {
    gk: pick((l) => l.ip === 'GK'),
    outfield: pick((l) => l.ip !== 'GK'),
    cbs: pick((l) => pos(l.oop) === 'D (C)'),
    defensive: pick((l) => ['D (C)', 'D (L)', 'D (R)', 'WB (L)', 'WB (R)', 'DM', 'M (C)'].includes(pos(l.oop))),
    wideOOP: pick((l) => l.oop !== 'GK' && (x(l.oop) < 30 || x(l.oop) > 70) && ctx.slots[l.oop][1] < 65),
    centralOOP: pick((l) => ['D (C)', 'DM', 'M (C)'].includes(pos(l.oop))),
    pressers: pick((l) => l.ip !== 'GK' && pos(l.oop) !== 'D (C)'),
    buildUp: pick((l) => ['D (C)', 'DM'].includes(pos(l.ip))),
    centralIP: pick((l) => ['DM', 'M (C)', 'AM (C)'].includes(pos(l.ip))),
    front: pick((l) => ['AM (L)', 'AM (R)', 'AM (C)', 'ST (C)'].includes(pos(l.ip))),
    attackers: pick((l) => ['AM (L)', 'AM (R)', 'AM (C)', 'ST (C)', 'M (L)', 'M (R)'].includes(pos(l.ip))),
    wideIP: pick((l) => l.ip !== 'GK' && (x(l.ip) < 30 || x(l.ip) > 70)),
    strikers: pick((l) => pos(l.ip) === 'ST (C)'),
    shooters: pick((l) => ['M (C)', 'AM (C)', 'AM (L)', 'AM (R)', 'DM'].includes(pos(l.ip))),
  };
  if (!groups.strikers.length) groups.strikers = groups.front.slice(0, 1);
  const level = mean(groups.outfield.map(generalLevel).filter((v) => v != null));
  const metrics = {};
  for (const [key, label, group, attrs] of METRICS) {
    const players = groups[group];
    const value = attrAvg(players, attrs);
    metrics[key] = {
      key,
      label,
      value,
      delta: value == null || level == null ? 0 : value - level,
      players: players.map((p) => p.name),
      attrs,
    };
  }
  const heights = (ps) => mean(ps.map((p) => p.heightCm).filter(Boolean));
  return {
    level,
    metrics,
    groups,
    cbHeight: heights(groups.cbs),
    strikerHeight: heights(groups.strikers),
    youngShare: groups.outfield.filter((p) => p.age != null && p.age <= 21).length / Math.max(1, groups.outfield.length),
  };
}
