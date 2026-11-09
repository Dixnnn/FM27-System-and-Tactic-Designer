// Generates fictional sample squads in the formats the tool reads. All players and clubs are made up.
// Run: npm run samples

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'samples');
mkdirSync(OUT, { recursive: true });

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GK_ATTRS = ['Aerial Reach', 'Command Of Area', 'Communication', 'Eccentricity', 'Handling', 'Kicking', 'One On Ones', 'Punching', 'Reflexes', 'Rushing Out (Tendency)', 'Throwing'];
const MENTAL = ['Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration', 'Decisions', 'Determination', 'Flair', 'Leadership', 'Off The Ball', 'Positioning', 'Team Work', 'Vision', 'Work Rate'];
const PHYSICAL = ['Acceleration', 'Agility', 'Balance', 'Jumping Reach', 'Natural Fitness', 'Pace', 'Stamina', 'Strength'];
const TECHNICAL = ['Crossing', 'Dribbling', 'Finishing', 'First Touch', 'Heading', 'Long Shots', 'Marking', 'Passing', 'Tackling', 'Technique'];
const SET_PIECES = ['Corners', 'Free Kick Taking', 'Long Throws', 'Penalty Taking'];
const ATTRS = [...GK_ATTRS, ...MENTAL, ...PHYSICAL, ...TECHNICAL, ...SET_PIECES];

// Archetypes: attributes that are high (H), good (G) or low (L); everything else is average.
const ARCH = {
  gkModern: { H: ['Reflexes', 'Handling', 'One On Ones', 'Agility', 'Positioning', 'Concentration', 'Command Of Area', 'Aerial Reach', 'Communication'], G: ['Kicking', 'Passing', 'Composure', 'Rushing Out (Tendency)', 'Anticipation', 'Decisions', 'Throwing'], gk: true },
  gkClassic: { H: ['Reflexes', 'Handling', 'Aerial Reach', 'Command Of Area', 'Positioning', 'Concentration'], G: ['Communication', 'Agility', 'One On Ones'], L: ['Kicking', 'Passing', 'Rushing Out (Tendency)', 'Composure'], gk: true },
  cbBallPlayer: { H: ['Passing', 'Composure', 'Marking', 'Tackling', 'Positioning', 'Anticipation', 'Heading'], G: ['Technique', 'Vision', 'Decisions', 'Jumping Reach', 'Strength', 'Concentration', 'First Touch'] },
  cbStopper: { H: ['Heading', 'Jumping Reach', 'Strength', 'Aggression', 'Bravery', 'Marking', 'Tackling'], G: ['Positioning', 'Anticipation', 'Concentration'], L: ['Pace', 'Acceleration', 'Passing', 'Technique', 'Dribbling', 'Flair'] },
  cbQuick: { H: ['Pace', 'Acceleration', 'Anticipation', 'Tackling', 'Marking', 'Positioning'], G: ['Concentration', 'Decisions', 'Agility', 'Heading'], L: ['Jumping Reach', 'Strength'] },
  fbAttack: { H: ['Crossing', 'Pace', 'Acceleration', 'Stamina', 'Work Rate', 'Off The Ball'], G: ['Dribbling', 'Team Work', 'Tackling', 'Marking', 'Agility', 'Technique'], L: ['Heading', 'Strength'] },
  fbDefend: { H: ['Marking', 'Tackling', 'Positioning', 'Concentration', 'Anticipation'], G: ['Team Work', 'Work Rate', 'Acceleration', 'Strength', 'Decisions'], L: ['Crossing', 'Flair', 'Dribbling'] },
  fbInverted: { H: ['Passing', 'First Touch', 'Technique', 'Composure', 'Decisions', 'Tackling'], G: ['Vision', 'Anticipation', 'Positioning', 'Team Work', 'Acceleration'] },
  dmAnchor: { H: ['Tackling', 'Positioning', 'Anticipation', 'Concentration', 'Team Work', 'Marking', 'Work Rate'], G: ['Strength', 'Aggression', 'Decisions', 'Stamina', 'Passing', 'Bravery'], L: ['Flair', 'Finishing', 'Dribbling'] },
  dmRegista: { H: ['Passing', 'Vision', 'First Touch', 'Technique', 'Composure', 'Decisions'], G: ['Team Work', 'Anticipation', 'Positioning', 'Concentration', 'Long Shots'], L: ['Pace', 'Strength', 'Heading'] },
  cmB2B: { H: ['Stamina', 'Work Rate', 'Team Work', 'Passing', 'Off The Ball', 'Tackling'], G: ['Long Shots', 'Pace', 'Acceleration', 'Decisions', 'Aggression', 'First Touch', 'Determination'] },
  cmCreator: { H: ['Passing', 'Vision', 'Technique', 'First Touch', 'Composure', 'Decisions'], G: ['Flair', 'Dribbling', 'Off The Ball', 'Team Work', 'Anticipation', 'Long Shots'], L: ['Tackling', 'Marking', 'Strength'] },
  am10: { H: ['Passing', 'Vision', 'Technique', 'Flair', 'First Touch', 'Composure', 'Off The Ball'], G: ['Dribbling', 'Long Shots', 'Decisions', 'Agility', 'Finishing'], L: ['Tackling', 'Marking', 'Heading', 'Strength'] },
  wingClassic: { H: ['Crossing', 'Dribbling', 'Pace', 'Acceleration', 'Agility'], G: ['Technique', 'First Touch', 'Flair', 'Off The Ball', 'Stamina', 'Work Rate'], L: ['Heading', 'Strength', 'Marking', 'Tackling'] },
  wingInside: { H: ['Dribbling', 'Finishing', 'First Touch', 'Technique', 'Acceleration', 'Agility', 'Off The Ball'], G: ['Composure', 'Long Shots', 'Pace', 'Flair', 'Anticipation', 'Balance'], L: ['Heading', 'Marking', 'Tackling', 'Crossing'] },
  stTarget: { H: ['Heading', 'Jumping Reach', 'Strength', 'Bravery', 'Finishing', 'Balance'], G: ['Aggression', 'Composure', 'Off The Ball', 'First Touch'], L: ['Pace', 'Acceleration', 'Dribbling', 'Agility'] },
  stPoacher: { H: ['Finishing', 'Off The Ball', 'Anticipation', 'Composure', 'Acceleration'], G: ['Pace', 'First Touch', 'Concentration', 'Agility', 'Dribbling'], L: ['Tackling', 'Marking', 'Passing', 'Vision'] },
  stLink: { H: ['First Touch', 'Technique', 'Composure', 'Finishing', 'Passing', 'Off The Ball'], G: ['Vision', 'Strength', 'Decisions', 'Team Work', 'Dribbling', 'Balance'] },
};

const GK_SET = new Set(GK_ATTRS);
function makeAttributes(rand, arch, quality, tweak = {}) {
  const a = ARCH[arch];
  const out = {};
  for (const name of ATTRS) {
    let base;
    if (GK_SET.has(name)) base = a.gk ? 11 : 2;
    else if (a.gk && TECHNICAL.includes(name)) base = 5;
    else base = 10;
    if (a.H?.includes(name)) base = 15;
    else if (a.G?.includes(name)) base = 12.5;
    else if (a.L?.includes(name)) base = 7;
    if (SET_PIECES.includes(name) && !a.gk) base = 8;
    const noise = Math.round((rand() - 0.5) * 4);
    let v = Math.round(base + quality + noise + (tweak[name] || 0));
    out[name] = Math.max(1, Math.min(20, v));
  }
  if (a.gk) {
    out.Passing = Math.max(out.Passing, a.H.includes('Kicking') || a.G?.includes('Passing') ? 12 : 8);
  }
  return out;
}

const FIRST = ['Callum', 'Rafael', 'Tomas', 'Elias', 'Kofi', 'Mateo', 'Jonah', 'Luca', 'Andre', 'Niklas', 'Oskar', 'Theo', 'Malik', 'Dario', 'Ruben', 'Sami', 'Yannick', 'Bram', 'Felix', 'Idris', 'Marco', 'Leon', 'Ivo', 'Caleb', 'Tariq', 'Emil', 'Jasper', 'Nuno', 'Ollie', 'Reece'];
const LAST = ['Ashdown', 'Brennan', 'Castell', 'Dunmore', 'Everly', 'Falkner', 'Garrow', 'Holloway', 'Iverson', 'Jessop', 'Kerrigan', 'Lindqvist', 'Marlowe', 'Northcott', 'Okafor', 'Pemberton', 'Quayle', 'Radley', 'Stroud', 'Thackeray', 'Ulloa', 'Vantongeren', 'Whitlock', 'Yardley', 'Zelenko', 'Ambrose', 'Bellweather', 'Corrigan', 'Draycott', 'Ellacombe'];

// The fictional squad: [position text, best pos, archetype, quality, foot (L/R/E), height, age, extras]
const SQUAD = [
  ['GK', 'GK', 'gkModern', 1.5, 'R', 191, 29, { personality: 'Model Professional', traits: 'Tries To Play Way Out Of Trouble' }],
  ['GK', 'GK', 'gkClassic', 0, 'R', 194, 33, { personality: 'Resolute' }],
  ['GK', 'GK', 'gkModern', -3, 'L', 188, 19, { personality: 'Fairly Determined' }],
  ['D (C)', 'D (C)', 'cbBallPlayer', 1.5, 'L', 188, 27, { personality: 'Model Citizen', traits: 'Brings Ball Out Of Defence, Tries Long Range Passes', bestRole: 'BCB' }],
  ['D (C)', 'D (C)', 'cbStopper', 1, 'R', 192, 30, { personality: 'Born Leader', traits: 'Dives Into Tackles, Marks Opponent Tightly', leadership: 6, bestRole: 'SCB' }],
  ['D (RC), DM', 'D (C)', 'cbQuick', 0.5, 'R', 184, 24, { personality: 'Determined', bestRole: 'CCB' }],
  ['D (C)', 'D (C)', 'cbStopper', -2, 'L', 190, 21, { personality: 'Balanced' }],
  ['D/WB (L)', 'D (L)', 'fbAttack', 1, 'L', 176, 25, { personality: 'Driven', traits: 'Gets Forward Whenever Possible, Runs With Ball Down Left', bestRole: 'WB' }],
  ['D (L)', 'D (L)', 'fbDefend', -1, 'L', 180, 28, { personality: 'Professional' }],
  ['D/WB (R)', 'D (R)', 'fbInverted', 1, 'R', 178, 26, { personality: 'Perfectionist', traits: 'Likes To Switch Ball To Other Flank', bestRole: 'IWB' }],
  ['D/WB (R), M (R)', 'D (R)', 'fbAttack', -1.5, 'R', 175, 20, { personality: 'Fairly Ambitious' }],
  ['DM', 'DM', 'dmAnchor', 1.5, 'R', 183, 29, { personality: 'Resolute', traits: 'Marks Opponent Tightly', leadership: 4, bestRole: 'SDM' }],
  ['DM, M (C)', 'DM', 'dmRegista', 1.5, 'R', 177, 31, { personality: 'Model Professional', traits: 'Likes To Switch Ball To Other Flank, Tries Long Range Passes', corners: 4, freekick: 5, bestRole: 'DLP' }],
  ['M (C)', 'M (C)', 'cmB2B', 1, 'R', 181, 26, { personality: 'Driven', traits: 'Gets Into Opposition Area', bestRole: 'BBM' }],
  ['DM, M (C)', 'M (C)', 'cmB2B', -1, 'L', 179, 23, { personality: 'Determined' }],
  ['M/AM (C)', 'M (C)', 'cmCreator', 1, 'L', 174, 24, { personality: 'Fairly Professional', traits: 'Plays One-Twos', corners: 5, freekick: 4, bestRole: 'MPM' }],
  ['M (C)', 'M (C)', 'cmCreator', -2.5, 'R', 172, 18, { personality: 'Light-Hearted' }],
  ['AM (C)', 'AM (C)', 'am10', 1.5, 'R', 175, 27, { personality: 'Balanced', traits: 'Tries Killer Balls Often, Shoots From Distance', freekick: 7, penalty: 5, bestRole: 'AP' }],
  ['M/AM (L)', 'AM (L)', 'wingClassic', 0.5, 'L', 173, 22, { personality: 'Driven', traits: 'Hugs Line, Runs With Ball Down Left', corners: 3, bestRole: 'W' }],
  ['AM (RL)', 'AM (L)', 'wingInside', 1.5, 'R', 178, 25, { personality: 'Ambitious', traits: 'Cuts Inside From Left Wing, Curls Ball', penalty: 4, bestRole: 'IF' }],
  ['M/AM (R)', 'AM (R)', 'wingInside', 1, 'L', 176, 24, { personality: 'Fairly Determined', traits: 'Cuts Inside From Right Wing', bestRole: 'IF' }],
  ['M/AM (R)', 'M (R)', 'wingClassic', -1, 'R', 171, 21, { personality: 'Unambitious' }],
  ['ST (C)', 'ST (C)', 'stPoacher', 1.5, 'R', 182, 28, { personality: 'Driven', traits: 'Gets Into Opposition Area, Moves Into Channels', penalty: 6, bestRole: 'P', injury: 'Hamstring Strain', info: 'Inj' }],
  ['ST (C)', 'ST (C)', 'stTarget', 0.5, 'R', 193, 30, { personality: 'Resolute', traits: 'Wins Aerial Balls', bestRole: 'TF' }],
  ['AM (C), ST (C)', 'ST (C)', 'stLink', 1, 'L', 183, 26, { personality: 'Professional', traits: 'Comes Deep To Get Ball', bestRole: 'DLF' }],
  ['ST (C)', 'ST (C)', 'stPoacher', -2, 'R', 179, 19, { personality: 'Light-Hearted' }],
];

const FOOT_WORDS = ['Very Weak', 'Weak', 'Reasonable', 'Fairly Strong', 'Strong', 'Very Strong'];

function buildRows(seed) {
  const rand = mulberry32(seed);
  return SQUAD.map((p, i) => {
    const [pos, best, arch, quality, foot, height, age, x] = p;
    const tweak = {};
    if (x.leadership) tweak.Leadership = x.leadership;
    if (x.corners) tweak.Corners = x.corners + 6;
    if (x.freekick) tweak['Free Kick Taking'] = x.freekick + 6;
    if (x.penalty) tweak['Penalty Taking'] = x.penalty + 6;
    const attrs = makeAttributes(rand, arch, quality, tweak);
    const weak = FOOT_WORDS[Math.floor(rand() * 3)];
    const left = foot === 'L' ? 'Very Strong' : weak;
    const right = foot === 'R' ? 'Very Strong' : weak;
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
    const stars = Math.max(0.5, Math.min(5, Math.round((2.5 + quality * 0.6) * 2) / 2));
    return {
      'Unique ID': String(91000000 + i * 137),
      Player: name,
      Position: pos,
      'Best Pos': best,
      Age: String(age),
      Club: 'Harbour City',
      Nation: ['ENG', 'SCO', 'IRL', 'WAL', 'NED', 'POR', 'GHA', 'SWE'][i % 8],
      Height: `${height} cm`,
      'Preferred Foot': foot === 'L' ? 'Left' : 'Right',
      'Left Foot': left,
      'Right Foot': right,
      Personality: x.personality || 'Balanced',
      Rating: (6.6 + rand() * 0.6).toFixed(2),
      Inf: x.info || '',
      'Best Role': x.bestRole || '',
      Ability: stars.toFixed(1),
      Potential: Math.min(5, stars + (age < 23 ? 1 : 0)).toFixed(1),
      ...Object.fromEntries(ATTRS.map((a) => [a, String(attrs[a])])),
      'Player Trait': x.traits || '',
      CON: `${x.injury ? 61 : 88 + Math.floor(rand() * 12)}%`,
      Injury: x.injury || '',
      Fatigue: rand() < 0.15 ? 'Tired' : 'Fresh',
    };
  });
}

function csvCell(v, d) {
  const s = String(v ?? '');
  return s.includes(d) || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(rows, headers, d = ',', bom = true) {
  const lines = [headers.map((h) => csvCell(h, d)).join(d)];
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h], d)).join(d));
  return (bom ? '﻿' : '') + lines.join('\r\n') + '\r\n';
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toHTML(rows, headers, title) {
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const body = rows.map((r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join('')}</tr>`).join('\n');
  return `<!doctype html>\n<html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body>\n<table>\n<tr>${head}</tr>\n${body}\n</table>\n</body></html>\n`;
}

const rows = buildRows(2027);
const headers = Object.keys(rows[0]);

writeFileSync(join(OUT, 'squad_20261108_201500.csv'), toCSV(rows, headers));
writeFileSync(join(OUT, 'squad_20261108_201500.html'), toHTML(rows, headers, 'Squad - FM View Exporter'));

// vinteset-style: semicolons, decimal commas, no Unique ID
const vHeaders = headers.filter((h) => h !== 'Unique ID');
const vRows = rows.map((r) => ({ ...r, Rating: r.Rating.replace('.', ','), Ability: r.Ability.replace('.', ','), Potential: r.Potential.replace('.', ',') }));
writeFileSync(join(OUT, 'player_export_20261108_201500.csv'), toCSV(vRows, vHeaders, ';', false));

// Scouting ranges on some attributes (as for players you have not fully scouted)
const rr = mulberry32(99);
const rangeRows = rows.map((r, i) => {
  if (i % 3 !== 0) return r;
  const copy = { ...r };
  for (const a of ATTRS) {
    if (rr() < 0.5) {
      const v = Number(copy[a]);
      const lo = Math.max(1, v - 1 - Math.floor(rr() * 2));
      const hi = Math.min(20, v + 1 + Math.floor(rr() * 2));
      copy[a] = `${lo}-${hi}`;
    } else if (rr() < 0.05) {
      copy[a] = '-';
    }
  }
  return copy;
});
writeFileSync(join(OUT, 'scouted-ranges.csv'), toCSV(rangeRows, headers));

// A file missing several columns, to show the "add these columns" message
const dropped = new Set(['Left Foot', 'Right Foot', 'Height', 'Personality', 'Player Trait', 'Marking', 'Off The Ball', 'Work Rate', 'Best Pos']);
writeFileSync(join(OUT, 'missing-columns.csv'), toCSV(rows, headers.filter((h) => !dropped.has(h))));

console.log(`Wrote ${rows.length} players x ${headers.length} columns to samples/`);
