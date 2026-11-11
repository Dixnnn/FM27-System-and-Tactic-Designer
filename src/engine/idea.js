// Your idea: a sentence such as "I want Lindqvist to score as many headers as possible" or "press high and
// win the ball back fast", turned into a tactic. Works offline without AI: it looks for football words and your
// players' names, shows what it understood, and turns each idea into nudges the engine already understands:
// who must start, which roles, which shapes, which team and player instructions, and the mentality.
// The intensity (Normal to Extreme) sets how hard it pushes, even at a cost in team fit.

export const INTENSITY = ['Normal', 'Strong', 'Very strong', 'Extreme'];
const ROLE_BONUS = [2, 4, 7, 12]; // added to a role's choice score for the tags an idea likes
const SHAPE_BONUS = [0.6, 1.2, 2.5, 5]; // added to a system's score per shape feature an idea likes
const WEIGHT = [1.6, 2.2, 3, 4.5]; // how much a named player's fit counts when systems are compared

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’`]/g, "'");
const val = (p, a) => p.attrs[a]?.v ?? null;
const avg = (p, attrs) => {
  const vs = attrs.map((a) => val(p, a)).filter((v) => v != null);
  return vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : null;
};
const has = (p, re) => [...p.positions].some((pos) => re.test(pos));
const surname = (p) => p.name.split(/\s+/).pop();

const SCORES = {
  aerial: (p) => (avg(p, ['Heading', 'Jumping Reach', 'Strength']) ?? 0) + Math.max(0, Math.min(2, ((p.heightCm || 180) - 180) / 5)),
  finish: (p) => avg(p, ['Finishing', 'Composure', 'Off The Ball', 'Anticipation']) ?? 0,
  create: (p) => avg(p, ['Passing', 'Vision', 'Technique', 'Decisions', 'First Touch']) ?? 0,
  dribble: (p) => avg(p, ['Dribbling', 'Flair', 'Agility', 'Technique']) ?? 0,
  shoot: (p) => avg(p, ['Long Shots', 'Technique']) ?? 0,
};
const FORWARD = /^(ST|AM)/;
const CENTRAL_MID = /^(DM|M \(C\)|AM \(C\))/;
const WIDE = /^(M|AM) \((L|R)/;

// Shape features of a formation pair (in possession, out of possession)
const count = (slots, re) => slots.filter((s) => re.test(s)).length;
const SHAPES = {
  wide: (ip) => (count(ip, /^(AM|M|WB)(L|R)$/) >= 2 ? 1 : 0),
  wingBacks: (ip) => (count(ip, /^WB(L|R)$/) >= 2 ? 1 : 0),
  twoStrikers: (ip) => (count(ip, /^ST/) >= 2 ? 1 : 0),
  oneStriker: (ip) => (count(ip, /^ST/) >= 1 ? 1 : 0),
  narrow: (ip) => (count(ip, /^(AM|M)(L|R)$/) === 0 ? 1 : 0),
  midfield: (ip) => (count(ip, /^(DM|MC|AMC)/) >= 3 ? 1 : 0),
  backFive: (ip, oop) => (count(oop, /^(D|WB)/) >= 5 ? 1 : 0),
  twoDM: (ip, oop) => (count(oop, /^DM/) >= 2 ? 1 : 0),
};

/**
 * Each idea: words that show it (and words that rule it out), whether it is about one player, how to pick that
 * player when none is named, and what it does at each intensity (k = 0 Normal ... 3 Extreme).
 */
const GOALS = [
  {
    id: 'aerial', label: 'Headed goals', player: true, pick: { score: SCORES.aerial, pos: FORWARD, why: 'your best striker in the air' },
    words: [/\bhead(er|ers|ed|ing)?\b/, /\bin the air\b/, /\baerial\b/, /\btarget (man|forward)\b/, /\bheaders?\b/],
    apply(a) {
      a.focusRoles({ target: 1, aerial: 1 }, 'a target role, so the team plays to his head');
      a.teamRoles({ crosser: 0.7, width: 0.5 }, 'wide players who cross');
      a.shape('wide', 1, 'shapes with players wide to cross for him');
      a.shape('twoStrikers', 0.3, 'a strike partner to work around him');
      a.set('crossingStyle', 'Floated Crosses', 0, 'Floated crosses hang in the air for a header.');
      a.set('progressThrough', 'Both Flanks', 0, 'Get the ball wide, where the crosses come from.');
      a.set('attackingWidth', 'Wider', 1, 'Stretch the pitch so crosses have room.');
      a.set('playForSetPieces', 'Play for Set Pieces', 1, 'Corners and free kicks: more chances to head the ball in.');
      a.set('patience', 'Hit Early Crosses', 2, 'Cross early and often.');
      a.set('supportingRuns', 'Both Flanks', 2, 'Full-backs overlap to add more crosses.');
      a.set('gkDistribution', 'Target Forward', 2, 'Goalkeeper aims for him too.');
      a.set('attackingWidth', 'Much Wider', 3, 'As wide as possible: everything goes to the flanks.');
      a.set('passingDirectness', 'More Direct', 3, 'Get the ball forward and into the box quickly.');
      a.set('goalKicks', 'Long', 3, 'Long goal kicks to his head.');
      a.pi('wide', 'IP', 'Cross From', 'Byline', 1, 'Cross from the byline, towards the striker.');
      a.pi('focus', 'IP', 'Hold Up Ball', 'Yes', 2, 'Win the ball in the air and hold it up.');
      a.aerialTarget();
      a.check(SCORES.aerial, 'in the air (heading, jumping reach, strength)');
    },
  },
  {
    id: 'goals', label: 'Goals for a player', player: true, pick: { score: SCORES.finish, pos: FORWARD, why: 'your best finisher' },
    words: [/\bscor(e|es|ing|er)\b/, /\bgoals?\b/, /\bgolden boot\b/, /\btop scorer\b/, /\bfinish(er|ing)?\b/],
    apply(a) {
      a.focusRoles({ finisher: 1, runner: 0.4 }, 'a finishing role in the box');
      a.teamRoles({ creator: 0.6 }, 'creators to feed him');
      a.shape('oneStriker', 0.5, 'a shape with a central striker');
      a.set('passReception', a.focusQuick() ? 'Pass Into Space' : 'Pass To Feet', 1, a.focusQuick() ? 'He is quick: play the ball into space for him.' : 'Get the ball to his feet in the box.');
      a.set('tempo', 'Higher', 2, 'More attacks, more chances for him.');
      a.set('creativeFreedom', 'More Expressive', 2, 'Let the creators find him.');
      a.mentality(1, 2, 'More players forward means more chances for him.');
      a.mentality(1, 3, 'All-out attack around him.');
      a.pi('focus', 'IP', 'Shooting', 'Shoot More Often', 1, 'He takes the shots.');
      a.pi('focus', 'IP', 'Forward Runs', 'More Often', 2, 'Always looking to get in behind.');
      a.check(SCORES.finish, 'finishing (finishing, composure, off the ball, anticipation)');
    },
  },
  {
    id: 'playmaker', label: 'Everything through a playmaker', player: true, pick: { score: SCORES.create, pos: CENTRAL_MID, why: 'your most creative midfielder' },
    words: [/\bplaymak/, /\bplay(s|ing)? (it )?through\b/, /\bcreative (hub|force|heart)\b/, /\beverything (goes )?through\b/, /\bdictat/, /\bpull(s|ing)? the strings\b/, /\borchestrat/],
    apply(a) {
      a.focusRoles({ creator: 1 }, 'a playmaker role');
      a.teamRoles({ runner: 0.5 }, 'runners to pick out');
      a.shape('midfield', 0.5, 'a shape with numbers in midfield');
      a.set('progressThrough', 'Middle', 0, 'Through the middle, where he plays.');
      a.set('gkDistribution', 'Playmaker', 1, 'Goalkeeper finds him straight away.');
      a.set('passingDirectness', 'Shorter', 1, 'Short passes keep the ball moving through him.');
      a.set('passReception', 'Pass To Feet', 2, 'Into feet, so he can link the play.');
      a.set('creativeFreedom', 'More Expressive', 2, 'Freedom to create.');
      a.pi('focus', 'IP', 'Passing Risk', 'Take More Risks', 1, 'He looks for the killer pass.');
      a.check(SCORES.create, 'creativity (passing, vision, technique, decisions)');
    },
  },
  {
    id: 'dribbler', label: 'A dribbler running at defenders', player: true, pick: { score: SCORES.dribble, pos: /^(AM|M \(L|M \(R|ST)/, why: 'your best dribbler' },
    words: [/\bdribbl/, /\btake (people|players|defenders|them|men) on\b/, /\brun at\b/, /\bflair\b/, /\bone[- ]on[- ]one\b/],
    apply(a) {
      a.focusRoles({ inside: 0.6, free: 0.6, runner: 0.6 }, 'a role with the ball at his feet');
      a.set('dribbling', 'Encourage', 0, 'Run at defenders.');
      a.set('creativeFreedom', 'More Expressive', 1, 'Freedom to try things.');
      a.set('passReception', 'Pass To Feet', 2, 'Into his feet, facing his man.');
      a.pi('focus', 'IP', 'Dribbling Frequency', 'Dribble More', 0, 'Take his man on.');
      a.check(SCORES.dribble, 'dribbling (dribbling, flair, agility, technique)');
    },
  },
  {
    id: 'longShots', label: 'Long shots', player: false,
    words: [/\blong[- ]?(range|shots?|distance)\b/, /\bfrom distance\b/, /\boutside the box\b/, /\bscreamers?\b/],
    apply(a) {
      a.teamRoles({ shooter: 0.6 }, 'midfielders who arrive to shoot');
      a.set('shotsFromDistance', 'Encourage', 0, 'Shoot from outside the box.');
      a.set('patience', 'Standard', 1, 'Don’t wait to work it into the box.');
      a.piBest(SCORES.shoot, /^(DM|M|AM)/, 'IP', 'Shooting', 'Shoot More Often', 1, 'Your best long-range shooter.');
    },
  },
  {
    id: 'wingPlay', label: 'Wing play and crosses', player: false,
    words: [/\bwing(s| play|play)\b/, /\bwide play\b/, /\bcross(es|ing)\b/, /\bflanks?\b/, /\bwingers?\b/],
    not: [/\bwing[- ]?backs?\b/],
    apply(a) {
      a.teamRoles({ width: 0.8, crosser: 0.8 }, 'wide roles that cross');
      a.shape('wide', 1, 'shapes with wingers or wing-backs');
      a.set('attackingWidth', 'Wider', 0, 'Use the whole width.');
      a.set('progressThrough', 'Both Flanks', 0, 'Attack down the flanks.');
      a.set('patience', 'Hit Early Crosses', 1, 'Get the crosses in early.');
      a.set('supportingRuns', 'Both Flanks', 1, 'Full-backs overlap on both sides.');
      a.set('attackingWidth', 'Much Wider', 2, 'As wide as possible.');
      a.pi('wide', 'IP', 'Cross From', 'Byline', 2, 'Get to the byline and cross.');
    },
  },
  {
    id: 'narrow', label: 'Through the middle', player: false,
    words: [/\bnarrow\b/, /\bthrough the middle\b/, /\bcentral(ly)?\b/, /\boverload the (middle|centre|center)\b/],
    apply(a) {
      a.shape('narrow', 1, 'shapes without wide midfielders');
      a.teamRoles({ inside: 0.6, creator: 0.4 }, 'roles that come inside');
      a.set('attackingWidth', 'Narrower', 0, 'Stay compact and close together.');
      a.set('progressThrough', 'Middle', 0, 'Through the middle.');
      a.set('attackingWidth', 'Much Narrower', 2, 'Everyone close together in the middle.');
    },
  },
  {
    id: 'highPress', label: 'High press', player: false,
    words: [/\bpress(ing)?\b/, /\bgegen/, /\bwin (the ball|it) back\b/, /\bhigh (line|block)\b/, /\bheavy metal\b/, /\bhunt(ing)? the ball\b/],
    not: [/\b(bypass|beat|avoid|play through|against|vs\.?|versus) (the |a |their )?press/],
    apply(a) {
      a.plan('lineOfEngagement', 'High Press');
      a.teamRoles({ presser: 0.8, ballWinner: 0.5 }, 'pressing roles');
      a.set('lineOfEngagement', 'High Press', 0, 'Press high up the pitch.');
      a.set('triggerPress', 'More Often', 0, 'Close down more often.');
      a.set('defensiveTransition', 'Counter-Press', 1, 'Win it back straight away when you lose it.');
      a.set('preventShortGkDistribution', 'Yes', 1, 'Don’t let them play out from goal kicks.');
      a.set('defensiveLine', 'Higher', 1, 'Push up behind the press.');
      a.set('tempo', 'Higher', 2, 'Play fast after winning it.');
      a.set('triggerPress', 'Much More Often', 2, 'Press all the time.');
      a.set('defensiveLine', 'Much Higher', 3, 'As high as it goes.');
      a.mentality(1, 3, 'Front foot all game.');
    },
  },
  {
    id: 'lowBlock', label: 'Defend deep', player: false,
    words: [/\bpark (the|a) bus\b/, /\bdefend deep\b/, /\bdeep block\b/, /\blow block\b/, /\bsit (back|deep)\b/, /\bclean sheets?\b/, /\bdon'?t concede\b/, /\bsolid\b/, /\bcatenaccio\b/, /\b(very |ultra[- ])?defensive (tactic|football|setup|approach|system)\b/],
    apply(a) {
      a.plan('lineOfEngagement', 'Low Block');
      a.teamRoles({ cover: 0.6, screen: 0.6, holder: 0.5, stopper: 0.4 }, 'covering and screening roles');
      a.shape('backFive', 0.6, 'a back five out of possession');
      a.shape('twoDM', 0.5, 'two holding midfielders');
      a.set('lineOfEngagement', 'Low Block', 0, 'Defend deep and compact.');
      a.set('defensiveLine', 'Lower', 0, 'No space behind your defence.');
      a.set('defensiveTransition', 'Regroup', 0, 'Get back into shape when you lose the ball.');
      a.set('triggerPress', 'Less Often', 1, 'Hold your shape instead of chasing.');
      a.set('timeWasting', 'More Often', 2, 'Slow the game down.');
      a.set('defensiveLine', 'Much Lower', 2, 'Right on top of your own box.');
      a.mentality(-1, 1, 'Safety first.');
      a.mentality(-1, 3, 'Everything behind the ball.');
    },
  },
  {
    id: 'counter', label: 'Counter-attack', player: false,
    words: [/\bcounter/, /\bon the break\b/, /\bbreak(s)? (quickly|fast)\b/, /\bfast breaks?\b/, /\btransitions?\b/],
    not: [/\bcounter[- ]?press/],
    apply(a) {
      a.plan('attackingTransition', 'Counter-Attack');
      a.teamRoles({ outlet: 0.8, runner: 0.5 }, 'outlets and runners to break with');
      a.set('attackingTransition', 'Counter-Attack', 0, 'Break as soon as you win the ball.');
      a.set('passReception', 'Pass Into Space', 0, 'Play into the space they leave.');
      a.set('gkDistributionSpeed', 'Distribute Quickly', 0, 'Keeper starts the counter at once.');
      a.set('passingDirectness', 'More Direct', 1, 'Forward quickly, before they recover.');
      a.set('defensiveTransition', 'Regroup', 1, 'Stay compact, then break.');
      if (!a.has('lowBlock') && !a.has('highPress')) a.set('lineOfEngagement', 'Mid Block', 2, 'Let them come, then hit them.');
      a.set('passingDirectness', 'Much More Direct', 3, 'Straight forward, every time.');
    },
  },
  {
    id: 'possession', label: 'Keep the ball', player: false,
    words: [/\bpossession\b/, /\bkeep (the )?ball\b/, /\btiki[- ]?taka\b/, /\bshort pass/, /\bdominat/, /\bcontrol (the )?(game|match)\b/, /\bpass(ing)? (it )?around\b/],
    apply(a) {
      a.plan('buildUpStrategy', 'Play Through Press');
      a.plan('attackingTransition', 'Hold Shape');
      a.teamRoles({ creator: 0.5, distributor: 0.5, link: 0.4 }, 'players who pass and link play');
      a.shape('midfield', 0.7, 'numbers in midfield');
      a.set('passingDirectness', 'Shorter', 0, 'Short passes, keep it.');
      a.set('patience', 'Work Ball Into Box', 0, 'Be patient; work it into the box.');
      a.set('goalKicks', 'Short', 0, 'Play out from the back.');
      a.set('buildUpStrategy', 'Play Through Press', 1, 'Pass through their press.');
      a.set('passReception', 'Pass To Feet', 1, 'Into feet, not space.');
      a.set('tempo', 'Lower', 1, 'No rush: let the ball do the work.');
      a.set('attackingTransition', 'Hold Shape', 2, 'Keep the ball when you win it.');
      a.set('passingDirectness', 'Much Shorter', 2, 'Only short passes.');
    },
  },
  {
    id: 'direct', label: 'Direct football', player: false,
    words: [/\bdirect\b/, /\blong ball/, /\broute one\b/, /\bover the top\b/, /\bin behind\b/],
    apply(a) {
      a.set('passingDirectness', 'More Direct', 0, 'Get the ball forward early.');
      a.set('passReception', 'Pass Into Space', 0, 'Balls in behind for runners.');
      a.set('buildUpStrategy', 'Bypass Press', 1, 'Go past their press.');
      a.set('goalKicks', 'Long', 1, 'Long goal kicks.');
      a.set('gkDistribution', 'Over Opposition Defence', 1, 'Keeper looks for runners in behind.');
      a.set('tempo', 'Higher', 1, 'Quick and forward.');
      a.set('passingDirectness', 'Much More Direct', 2, 'Straight forward, every time.');
    },
  },
  {
    id: 'setPieces', label: 'Set pieces', player: false,
    words: [/\bset[- ]?pieces?\b/, /\bcorners?\b/, /\bfree[- ]?kicks?\b/, /\bdead[- ]?ball/],
    apply(a) {
      a.set('playForSetPieces', 'Play for Set Pieces', 0, 'Win corners and free kicks on purpose.');
      a.set('crossingStyle', 'Floated Crosses', 1, 'Good balls into the box for your big players.');
      a.note('Set your best headers as targets and your best crossers on corners (section 2, step 6).');
    },
  },
  {
    id: 'youth', label: 'Minutes for young players', player: false,
    words: [/\byoung(sters)?\b/, /\byouth\b/, /\bkids\b/, /\bacademy\b/, /\bdevelop/, /\bwonderkids?\b/, /\bprospects?\b/],
    apply(a) {
      a.youth([2, 4, 7, 12][a.k], 'Players aged 21 or under win close calls for a place (more so at higher intensity).');
    },
  },
  {
    id: 'attackingBacks', label: 'Attacking full-backs', player: false,
    words: [/\battacking (full|wing)[- ]?backs?\b/, /\bwing[- ]?backs?\b/, /\b(full|wing)[- ]?backs? (bomb|get|push) forward\b/, /\boverlapp/],
    apply(a) {
      a.teamRoles({ attackingBack: 1 }, 'attacking full-back or wing-back roles');
      a.shape('wingBacks', 0.8, 'shapes with wing-backs');
      a.set('supportingRuns', 'Both Flanks', 0, 'Full-backs bomb on.');
      a.set('attackingWidth', 'Wider', 1, 'Width from the full-backs.');
    },
  },
];

// Names that are also everyday words ("young players", "long shots", "I will"): only the full name counts.
const COMMON_WORDS = new Set(['will', 'mark', 'bill', 'frank', 'grant', 'rich', 'chase', 'hunter', 'young', 'king', 'long', 'white', 'black',
  'green', 'brown', 'best', 'hope', 'may', 'page', 'ward', 'hall', 'wood', 'stone', 'lord', 'fast', 'quick', 'little', 'head', 'cross',
  'wing', 'banks', 'park', 'press', 'ball', 'goal', 'box', 'sharp', 'bright', 'strong', 'cole', 'lee', 'mason', 'rose', 'day', 'way']);

const CONFLICTS = [['highPress', 'lowBlock'], ['possession', 'direct'], ['wingPlay', 'narrow'], ['possession', 'counter']];
const NEGATION = /\b(don'?t|do not|no|not|never|without|avoid|stop|less)\s+(\w+\s+){0,2}$/;
const BUILD_AROUND = /\b(build|built|based|centred|centered|focus(ed)?|revolve[sd]?)\b[^.]*\b(around|on)\b/;

/** Players named in the text: full name, surname, or a first name unique in the squad. */
function namedPlayers(text, players) {
  const t = norm(text);
  const found = [];
  const firstNames = new Map();
  for (const p of players) {
    const first = norm(p.name.split(/\s+/)[0]);
    firstNames.set(first, (firstNames.get(first) || 0) + 1);
  }
  const surnames = new Map();
  for (const p of players) {
    const s = norm(surname(p));
    surnames.set(s, (surnames.get(s) || 0) + 1);
  }
  for (const p of players) {
    const keys = [norm(p.name)];
    const last = norm(surname(p));
    if (!COMMON_WORDS.has(last)) keys.push(last);
    const first = norm(p.name.split(/\s+/)[0]);
    if (first.length >= 4 && firstNames.get(first) === 1 && !COMMON_WORDS.has(first)) keys.push(first);
    for (const k of keys) {
      if (k.length < 3) continue;
      const re = new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}('s)?(?=$|[^a-z])`);
      const m = re.exec(t);
      if (m) {
        found.push({ player: p, at: m.index, ambiguous: k === norm(surname(p)) && surnames.get(k) > 1 });
        break;
      }
    }
  }
  return found.sort((a, b) => a.at - b.at);
}

/**
 * Read an idea. Pure: no searching, so the app can show what it understood while you type.
 * @param {string} text
 * @param {object[]} players  the squad (players on loan or unavailable are ignored)
 * @param {number} intensity  0 Normal .. 3 Extreme
 * @param {{level?: number}} [opts]  team level (for "is he good at this?" checks)
 */
export function interpretIdea(text, players, intensity = 0, opts = {}) {
  const k = Math.max(0, Math.min(3, Math.round(Number(intensity) || 0)));
  const pool = players.filter((p) => !p.onLoan && !p.unavailable);
  const t = norm(text);
  const named = namedPlayers(text, pool);
  const hits = [];
  const ignored = [];
  for (const g of GOALS) {
    if ((g.not || []).some((re) => re.test(t))) continue;
    let first = null;
    for (const re of g.words) {
      const m = new RegExp(re.source, 'g').exec(t);
      if (m && (first == null || m.index < first.at)) first = { at: m.index, word: m[0] };
    }
    if (!first) continue;
    const before = t.slice(Math.max(0, first.at - 24), first.at);
    if (!/n'?t|not/.test(first.word) && NEGATION.test(before)) {
      ignored.push(`"${before.trim().split(/\s+/).slice(-2).join(' ')} ${first.word}"`);
      continue;
    }
    hits.push({ goal: g, at: first.at });
  }
  hits.sort((a, b) => a.at - b.at);

  // Who each player idea is about: the nearest named player, else the best fit in the squad.
  const level = opts.level ?? 11;
  const understood = [];
  const usedNames = new Set();
  for (const h of hits) {
    let player = null;
    let auto = false;
    if (h.goal.player) {
      const near = named
        .map((n) => ({ ...n, d: Math.abs(n.at - h.at) }))
        .sort((a, b) => a.d - b.d)[0];
      if (near) {
        player = near.player;
        usedNames.add(near.player);
      } else {
        const pick = h.goal.pick;
        player = pool.filter((p) => has(p, pick.pos)).sort((a, b) => pick.score(b) - pick.score(a))[0] || null;
        auto = !!player;
      }
    }
    understood.push({ id: h.goal.id, label: h.goal.label, goal: h.goal, player, auto, autoWhy: auto ? h.goal.pick.why : null });
  }
  // A named player with no idea attached ("build it around Ellacombe") is built around: he starts and counts more.
  for (const n of named) {
    if (usedNames.has(n.player)) continue;
    understood.push({ id: 'buildAround', label: 'Built around a player', player: n.player, goal: null, auto: false });
  }

  const plan = buildPlan(understood, k, level, pool);
  plan.done = [];
  plan.text = text;
  plan.intensity = k;
  plan.intensityLabel = INTENSITY[k];
  plan.understood = understood.map(({ goal, ...u }) => u);
  plan.ignored = ignored;
  plan.ambiguous = named.filter((n) => n.ambiguous).map((n) => n.player);
  plan.empty = understood.length === 0;
  for (const [a, b] of CONFLICTS) {
    const ia = understood.findIndex((u) => u.id === a);
    const ib = understood.findIndex((u) => u.id === b);
    if (ia >= 0 && ib >= 0) {
      const later = understood[Math.max(ia, ib)];
      const earlier = understood[Math.min(ia, ib)];
      plan.notes.unshift(`"${earlier.label}" and "${later.label}" pull in opposite directions: where they clash, "${later.label}" (mentioned later) wins.`);
    }
  }
  return plan;
}

function buildPlan(understood, k, level, pool) {
  const plan = {
    roleBias: { team: {}, byPlayer: {} },
    shapes: [],
    weights: {},
    locks: [],
    youthBonus: 0,
    planOverride: {},
    overrides: {},
    reasons: {},
    mentalityDelta: 0,
    mentalityReasons: [],
    pis: [],
    aerialTarget: null,
    actions: [],
    notes: [],
  };
  for (const u of understood) {
    const focus = u.player;
    const nm = focus ? surname(focus) : '';
    const tag = (text) => (u.label ? `${u.label}${focus ? ` (${nm})` : ''}: ${text}` : text);
    if (focus) {
      plan.locks.push(focus.id);
      plan.weights[focus.id] = Math.max(plan.weights[focus.id] || 1, WEIGHT[k]);
      plan.actions.push(`${focus.name} always starts and his fit counts ${WEIGHT[k]}× when shapes and roles are compared${u.auto ? ` (picked as ${u.autoWhy})` : ''}.`);
    }
    if (!u.goal) continue;
    const api = {
      k,
      has: (id) => understood.some((x) => x.id === id),
      focusRoles(tags, why) {
        if (!focus) return;
        const b = (plan.roleBias.byPlayer[focus.id] ||= {});
        for (const [t, m] of Object.entries(tags)) b[t] = Math.max(b[t] || 0, ROLE_BONUS[k] * m);
        plan.actions.push(`${nm} is steered towards ${why}.`);
      },
      teamRoles(tags, why) {
        for (const [t, m] of Object.entries(tags)) plan.roleBias.team[t] = Math.max(plan.roleBias.team[t] || 0, ROLE_BONUS[k] * m);
        plan.actions.push(`The rest of the team is steered towards ${why}.`);
      },
      shape(feature, m, why) {
        plan.shapes.push({ feature, bonus: SHAPE_BONUS[k] * m, test: SHAPES[feature] });
        plan.actions.push(`Prefers ${why}.`);
      },
      set(id, value, minK, why) {
        if (k < minK) return;
        plan.overrides[id] = value;
        plan.reasons[id] = `Your idea${u.label ? ` (${u.label.toLowerCase()})` : ''}: ${why}`;
      },
      plan(key, value) {
        plan.planOverride[key] = value;
      },
      mentality(delta, minK, why) {
        if (k < minK) return;
        plan.mentalityDelta += delta;
        plan.mentalityReasons.push(why);
      },
      pi(who, phase, name, value, minK, why) {
        if (k < minK) return;
        plan.pis.push({ who: who === 'focus' ? focus : who, phase, name, value, reason: tag(why) });
      },
      piBest(score, pos, phase, name, value, minK, why) {
        if (k < minK) return;
        plan.pis.push({ who: { best: score, pos }, phase, name, value, reason: tag(why) });
      },
      youth(bonus, why) {
        plan.youthBonus = Math.max(plan.youthBonus, bonus);
        plan.actions.push(why);
      },
      aerialTarget() {
        if (focus) plan.aerialTarget = focus;
      },
      focusQuick() {
        return !!focus && (avg(focus, ['Pace', 'Acceleration']) ?? 0) >= level + 1;
      },
      check(score, what) {
        if (!focus) return;
        const s = score(focus);
        const best = pool.filter((p) => p !== focus).sort((a, b) => score(b) - score(a))[0];
        if (s < level - 0.5) {
          plan.notes.push(`${focus.name} isn't strong at this: his ${what} average ${s.toFixed(1)}, below your team's level of ${level.toFixed(1)}. The tactic can set it up, but it fights his attributes${best && score(best) > s + 2 ? `; ${best.name} (${score(best).toFixed(1)}) would suit the idea better` : ''}.`);
        }
      },
      note(text) {
        plan.notes.push(text);
      },
    };
    u.goal.apply(api);
  }
  plan.locks = [...new Set(plan.locks)];
  plan.actions = [...new Set(plan.actions)];
  return plan;
}

/** What the engine needs from a plan (search options). */
export function ideaSearchOptions(plan) {
  if (!plan || plan.empty) return {};
  return {
    ideaRoleBias: plan.roleBias,
    ideaShapes: plan.shapes,
    weights: plan.weights,
    extraLocks: plan.locks,
    ...(plan.youthBonus ? { youthBonus: plan.youthBonus } : {}),
  };
}

/**
 * After the search: player instructions and set-piece targets from the idea, on the tactic as built.
 * Mutates result.playerInstructions and result.setPieces; returns concrete lines for the report.
 */
export function applyIdeaToResult(result, plan) {
  const slots = result.ctx.slots;
  const lanes = result.best.lanes;
  const done = [];
  const laneOf = (p) => lanes.find((l) => l.player === p);
  const wide = lanes.filter((l) => {
    const [x, , pos] = slots[l.ip];
    return (x < 30 || x > 70) && /^(M|AM|WB) /.test(pos);
  });
  const addPI = (lane, pi) => {
    let entry = result.playerInstructions.find((x) => x.lane === lane);
    if (!entry) {
      entry = { lane, player: lane.player, items: [] };
      result.playerInstructions.push(entry);
    }
    entry.items = entry.items.filter((i) => i.name !== pi.name);
    entry.items.push({ phase: pi.phase, name: pi.name, value: pi.value, reason: pi.reason });
  };
  for (const pi of plan.pis) {
    let targets = [];
    if (pi.who === 'wide') targets = wide;
    else if (pi.who && pi.who.best) {
      const cand = lanes.filter((l) => pi.who.pos.test(slots[l.ip][2])).sort((a, b) => pi.who.best(b.player) - pi.who.best(a.player))[0];
      targets = cand ? [cand] : [];
    } else if (pi.who) targets = [laneOf(pi.who)].filter(Boolean);
    for (const l of targets) addPI(l, pi);
  }
  if (plan.aerialTarget && laneOf(plan.aerialTarget)) {
    const sp = result.setPieces;
    const p = plan.aerialTarget;
    const others = sp.aerialTargets.filter((t) => t.player !== p && t.name !== p.name);
    sp.aerialTargets = [{ name: p.name, player: p, height: p.heightCm }, ...others];
  }
  const seen = new Set();
  for (const u of plan.understood) {
    if (!u.player || seen.has(u.player)) continue;
    seen.add(u.player);
    const l = laneOf(u.player);
    done.push(l
      ? `${u.player.name}: ${slots[l.ip][3]} as ${l.ipRole.name}, ${slots[l.oop][3]} as ${l.oopRole.name} (fit ${l.ipScore.score.toFixed(0)} / ${l.oopScore.score.toFixed(0)}).`
      : `${u.player.name} couldn't be fitted into the XI.`);
  }
  return done;
}
