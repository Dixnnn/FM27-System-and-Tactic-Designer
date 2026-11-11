// The studio pundit: one cheeky line about the tactic, shown under the report title. Just for fun; it reads the
// tactic's real settings, so a high press gets a pressing joke and a low block gets a bus joke. The same tactic
// always gets the same line.

/** Lines by what the tactic does. Earlier groups win when several match. */
const RULES = [
  { when: (t) => t.idea === 'aerial', lines: [
    'Somewhere, a crossing coach just shed a single proud tear.',
    'If the ball stays on the grass for ten seconds, someone gets a stern word.',
    'The plan is simple: get it wide, put it on a head, repeat until the net bulges.',
  ] },
  { when: (t) => t.idea === 'youth', lines: [
    'The academy kids have been told to pack their boots. And their homework.',
    'Average age of the starting XI: still doing their GCSEs.',
  ] },
  { when: (t) => t.idea === 'setPieces', lines: [
    'Open play is just the bit between corners.',
    'The set-piece coach has been given a corner office. Naturally.',
  ] },
  { when: (t) => t.press === 'High Press' && t.transition === 'Counter-Press', lines: [
    'Presses like the opposition owes them money.',
    'Ninety minutes of chasing. The physios have cancelled their weekend.',
    'Lose the ball, get it back, apologise to nobody.',
  ] },
  { when: (t) => t.press === 'Low Block' && t.attackTransition === 'Counter-Attack', lines: [
    'Happy to let you have the ball. Happy to let you regret it.',
    'Parks the bus, then sells you a ticket for the counter-attack.',
    'Absorb, absorb, absorb, and then gone.',
  ] },
  { when: (t) => t.press === 'High Press', lines: [
    'Starts defending about four seconds after kick-off, in the other team’s box.',
    'The opposition keeper won’t get a moment’s peace.',
    'Pressing so high the strikers need a map back to their own half.',
  ] },
  { when: (t) => t.press === 'Low Block', lines: [
    'Defends like the halfway line is lava.',
    'Two banks of deep defenders and a very strong opinion about space.',
    'You’ll have to come and get us. Bring a ladder.',
  ] },
  { when: (t) => /Shorter/.test(t.passing) && /Lower/.test(t.tempo), lines: [
    'Patience is a virtue. So are seven hundred passes.',
    'Will pass the ball into the net eventually. Bring a flask.',
  ] },
  { when: (t) => /Direct/.test(t.passing) && (t.goalKicks === 'Long' || t.patience === 'Hit Early Crosses'), lines: [
    'The ball will spend a lot of time near the clouds.',
    'Why pass it ten times when you can launch it once?',
  ] },
  { when: (t) => /Shorter/.test(t.passing), lines: [
    'Short passes, triangles, and the occasional square that’s really a triangle.',
    'Pass, move, pass, move. The ball will be exhausted.',
  ] },
  { when: (t) => /Attacking/.test(t.mentality), lines: [
    'Defending is mostly a rumour.',
    'Plans to win 4-3 and call it a clean sheet in spirit.',
  ] },
  { when: (t) => /Defensive|Cautious/.test(t.mentality), lines: [
    'A goalless draw would be described as a good afternoon at the office.',
    'Risk has been politely asked to wait outside.',
  ] },
  { when: (t) => t.backThree, lines: [
    'Three centre-backs: one to defend, one to cover, one to start arguments.',
    'Back three, wing-backs bombing on, and a lot of faith in their lungs.',
  ] },
  { when: (t) => t.twoUpTop, lines: [
    'Two up top, like the old days, but with more spreadsheets.',
    'Strike partnership loading. Please do not disturb.',
  ] },
  { when: (t) => /Wider/.test(t.width), lines: [
    'Wide enough to need a second postcode.',
    'The touchline paint is in serious danger.',
  ] },
  { when: (t) => t.fit >= 72, lines: [
    'Square pegs, square holes. The kit man approves.',
    'Everyone in their best spot. Suspiciously sensible.',
  ] },
  { when: (t) => t.fit < 55, lines: [
    'A few round pegs, a few square holes, and plenty of optimism.',
    'It’s not the squad you’d pick, but it’s the squad you’ve got.',
  ] },
  { when: () => true, lines: [
    'Looks great on paper. Paper doesn’t have to play away on a wet Tuesday.',
    'Balanced, sensible, and hiding at least one surprise.',
    'The board will call it pragmatic. The fans will call it Saturday.',
  ] },
];

function hash(s) {
  let h = 5381;
  for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h;
}

/** What the jokes look at, read from the result. */
function traits(result) {
  const v = result.instructions?.values || {};
  const slots = result.ctx?.slots || {};
  const ipSlots = (result.best?.lanes || []).map((l) => String(slots[l.ip]?.[2] || ''));
  const centreBacks = ipSlots.filter((p) => /^D \(C\)/.test(p)).length;
  const strikers = ipSlots.filter((p) => /^ST/.test(p)).length;
  const idea = result.idea && !result.idea.empty ? (result.idea.understood || []).map((u) => u.id)[0] : null;
  return {
    idea,
    press: v.lineOfEngagement,
    transition: v.defensiveTransition,
    attackTransition: v.attackingTransition,
    passing: v.passingDirectness || '',
    tempo: v.tempo || '',
    width: v.attackingWidth || '',
    goalKicks: v.goalKicks,
    patience: v.patience,
    mentality: result.instructions?.mentality?.value || '',
    backThree: centreBacks >= 3,
    twoUpTop: strikers >= 2,
    fit: result.best?.fit ?? 60,
  };
}

/** One line for this tactic (always the same line for the same tactic). */
export function punditLine(result) {
  const t = traits(result);
  const rule = RULES.find((r) => r.when(t));
  const key = [result.club, result.best?.ipName, result.best?.oopName, t.press, t.mentality].join('|');
  return rule.lines[hash(key) % rule.lines.length];
}

export const PUNDIT_LINES = RULES.flatMap((r) => r.lines);
