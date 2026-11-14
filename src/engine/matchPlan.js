// Match plan for the next opponent: you say what they are like (how strong, home or away, how they play,
// what their players are good at); the tool picks which of your tactics to start from and which team
// instructions to change, each with a reason that comes from your own squad profile.

export const OPPONENT = {
  strength: [['muchStronger', 'Much stronger'], ['stronger', 'A bit stronger'], ['similar', 'About the same'], ['weaker', 'A bit weaker'], ['muchWeaker', 'Much weaker']],
  venue: [['home', 'Home'], ['away', 'Away']],
  style: [
    ['pressHigh', 'Press high'], ['sitDeep', 'Sit deep'], ['longBalls', 'Play long balls'], ['counter', 'Counter-attack'],
    ['playOut', 'Play out from the back'], ['possession', 'Keep the ball'], ['crosses', 'Cross a lot'],
  ],
  players: [
    ['fastForwards', 'Fast forwards'], ['tallStriker', 'A tall, strong striker'], ['fastWingers', 'Fast wingers'],
    ['weakAir', 'Weak in the air at the back'], ['slowCBs', 'Slow centre-backs'],
  ],
};

const STRENGTH_SCORE = { muchStronger: -2, stronger: -1, similar: 0, weaker: 1, muchWeaker: 2 };
const LABEL = Object.fromEntries([...OPPONENT.strength, ...OPPONENT.venue, ...OPPONENT.style, ...OPPONENT.players]);

const f1 = (n) => (n == null ? '–' : n.toFixed(1));

/** True when nothing about the opponent was chosen. */
export const isEmptyOpponent = (opp) => !opp || (!opp.strength && !opp.venue && !(opp.style || []).length && !(opp.players || []).length);

/**
 * @param {object} result  analyse() result (main tactic, alternatives, profile)
 * @param {{strength?:string, venue?:string, style?:string[], players?:string[]}} opp
 */
export function matchPlan(result, opp = {}) {
  const style = new Set(opp.style || []);
  const traits = new Set(opp.players || []);
  const m = result.profile.metrics;
  const d = (k) => m[k]?.delta ?? 0;
  const v = (k) => m[k]?.value ?? null;
  const level = result.profile.level;
  const mentalities = result.ctx.instructionsDoc.mentalities;

  // 1. Which tactic to start from: strength and venue together.
  const score = (STRENGTH_SCORE[opp.strength] ?? 0) + (opp.venue === 'home' ? 0.5 : opp.venue === 'away' ? -0.5 : 0);
  const findAlt = (t) => (result.alternatives || []).find((a) => a.title.startsWith(t) && !a.similar);
  let base = { title: 'Your main tactic', alt: null, why: 'A fairly even game: your main tactic suits it.' };
  if (score <= -1.5 && findAlt('Away')) base = { title: findAlt('Away').title, alt: findAlt('Away'), why: 'They are clearly better than you: start from your defensive setup and hit them on the break.' };
  else if (score >= 1.5 && findAlt('At home')) base = { title: findAlt('At home').title, alt: findAlt('At home'), why: 'You should have most of the ball: start from your front-foot setup.' };
  const ins = base.alt ? base.alt.instructions : result.instructions;
  const items = Object.fromEntries([...ins.ip, ...ins.oop].map((i) => [i.id, i]));
  const values = { ...ins.values };

  // Mentality: one step either way for a smaller edge, on top of the base tactic.
  const baseMentality = ins.mentality.value;
  let mentality = { value: baseMentality, reason: 'As in the tactic you start from.' };
  const stepM = (by) => mentalities[Math.max(0, Math.min(mentalities.length - 1, mentalities.indexOf(baseMentality) + by))];
  if (!base.alt && score <= -0.5 && score > -1.5) mentality = { value: stepM(-1), reason: 'One step more careful: they are a little stronger, or you are away.' };
  if (!base.alt && score >= 0.5 && score < 1.5) mentality = { value: stepM(1), reason: 'One step more positive: they are a little weaker, or you are at home.' };

  const changes = new Map();
  const notes = [];
  const set = (id, value, reason) => {
    const item = items[id];
    if (!item || !item.options.includes(value)) return;
    const from = values[id];
    if (from === value && !changes.has(id)) return;
    const prev = changes.get(id);
    // when two rules agree, the first reason stands; a later rule that disagrees wins with its own reason
    changes.set(id, { id, name: item.name, from: prev ? prev.from : from, to: value, reason: prev && prev.to === value ? prev.reason : reason });
    values[id] = value;
  };
  const step = (id, by, reason) => {
    const item = items[id];
    if (!item) return;
    const i = item.options.indexOf(values[id]);
    if (i < 0) return;
    set(id, item.options[Math.max(0, Math.min(item.options.length - 1, i + by))], reason);
  };
  const cbNames = result.best.lanes.filter((l) => /^D(C|CL|CR)$/.test(l.ip) || /^DC/.test(l.ip)).map((l) => l.player);
  const bestHeader = cbNames
    .map((p) => ({ p, s: ((p.attrs['Heading']?.v ?? 0) + (p.attrs['Jumping Reach']?.v ?? 0) + (p.attrs['Strength']?.v ?? 0)) / 3 }))
    .sort((a, b) => b.s - a.s)[0]?.p;

  // 2. How they play.
  if (style.has('pressHigh')) {
    if (d('buildUp') >= 1 && d('composure') >= 0) {
      set('buildUpStrategy', 'Play Through Press', `Your back line plays out well (${f1(v('buildUp'))} against your level of ${f1(level)}): beat their press and the space behind it is yours.`);
      if (d('fwdPace') >= 1) set('passReception', 'Pass Into Space', `Once through the press, your quick front line (${f1(v('fwdPace'))}) can run into the space they leave.`);
    } else {
      set('buildUpStrategy', 'Bypass Press', `Playing out isn't a strength (${f1(v('buildUp'))} against your level of ${f1(level)}): go past their press instead of through it.`);
      set('goalKicks', 'Long', 'Long goal kicks keep the ball away from their press.');
      set('gkDistribution', d('aerialAttack') >= 0.5 ? 'Target Forward' : d('fwdPace') >= 1 ? 'Over Opposition Defence' : 'Flanks',
        d('aerialAttack') >= 0.5 ? 'Your striker is strong in the air: aim for him.' : d('fwdPace') >= 1 ? 'Your quick forwards can chase balls over their high line.' : 'The flanks are where a pressing side leaves room.');
      step('passingDirectness', 1, 'A little more direct, to get the ball forward before they close you down.');
    }
  }
  if (style.has('sitDeep')) {
    set('patience', 'Work Ball Into Box', 'They defend deep and narrow: be patient and work the ball into the box.');
    step('attackingWidth', 1, 'Stretch a deep block by using the whole width of the pitch.');
    if (d('aerialAttack') >= 1) {
      set('crossingStyle', 'Floated Crosses', `Your strikers win headers (${f1(v('aerialAttack'))}): crosses are a good way through a packed box.`);
      set('playForSetPieces', 'Play for Set Pieces', 'Corners and free kicks are a strong way to break down a deep defence with your aerial strength.');
    }
    if (d('longShots') >= 1) set('shotsFromDistance', 'Encourage', `They leave room outside the box, and your midfield can shoot (${f1(v('longShots'))}).`);
    if (d('pressing') >= 0) set('lineOfEngagement', 'High Press', 'They will try to keep it simple at the back: press them there.');
  }
  if (style.has('longBalls')) {
    if (d('cbAerial') >= 0.5) notes.push(`Your centre-backs are good in the air (${f1(v('cbAerial'))}): keep your line and win the long balls.`);
    else step('defensiveLine', -1, `Your centre-backs aren't strong in the air (${f1(v('cbAerial'))}): drop a little deeper so long balls land in front of them.`);
    if (d('cbPace') < 0) set('defensiveLineBehaviour', 'Drop Off More', 'Drop off rather than step up, so nobody gets in behind.');
  }
  if (style.has('counter')) {
    const defensiveBase = base.alt && base.alt.title.startsWith('Away');
    if (d('pressing') >= 0.5 && !defensiveBase) set('defensiveTransition', 'Counter-Press', `Win the ball back straight away (your pressing: ${f1(v('pressing'))}) before their counter-attack starts.`);
    else set('defensiveTransition', 'Regroup', 'Get back into shape the moment you lose the ball: their counter-attacks are their main weapon.');
    if (values.supportingRuns === 'Both Flanks') set('supportingRuns', 'Balanced', 'Keep a full-back at home against a counter-attacking side.');
    if (d('cbPace') < 0) step('defensiveLine', -1, `Your centre-backs aren't quick (${f1(v('cbPace'))}): a deeper line leaves less space to run into.`);
  }
  if (style.has('playOut')) {
    if (d('pressing') >= 0) {
      set('lineOfEngagement', 'High Press', `They like to play out from the back, and your team can press (${f1(v('pressing'))}).`);
      step('triggerPress', 1, 'Press their defenders more often to force mistakes.');
      set('preventShortGkDistribution', 'Yes', 'Stop the short goal kick and they have to go long.');
      set('pressingTrap', 'Trap Outside', 'Push their build-up towards the touchline, where it is easiest to win the ball.');
    } else {
      notes.push(`Pressing isn't your strength (${f1(v('pressing'))}): let them have the ball at the back and stay compact.`);
      set('lineOfEngagement', 'Mid Block', 'Stay compact rather than chase the ball.');
    }
  }
  if (style.has('possession')) {
    if (d('pressing') < 1) set('lineOfEngagement', 'Mid Block', 'They will keep the ball anyway: stay compact and save energy.');
    if (d('fwdPace') >= 0.5) set('attackingTransition', 'Counter-Attack', `Win it and break quickly while they are spread out (front line pace ${f1(v('fwdPace'))}).`);
    set('defensiveTransition', 'Regroup', 'Get back into shape quickly when you lose the ball.');
  }
  if (style.has('crosses')) {
    if (d('cbAerial') >= 1) set('crossEngagement', 'Invite Crosses', `Your centre-backs win headers (${f1(v('cbAerial'))}): let them cross.`);
    else set('crossEngagement', 'Stop Crosses', `Your centre-backs aren't dominant in the air (${f1(v('cbAerial'))}): close down crosses.`);
  }

  // 3. Their players.
  if (traits.has('fastForwards')) {
    if (d('cbPace') < 1) {
      step('defensiveLine', -1, `Their forwards are quick and your centre-backs aren't (${f1(v('cbPace'))}): don't leave space behind.`);
      set('defensiveLineBehaviour', 'Drop Off More', 'Drop off rather than step up against quick forwards.');
    } else notes.push(`Your centre-backs are quick (${f1(v('cbPace'))}): you can keep your line against their fast forwards.`);
  }
  if (traits.has('tallStriker')) {
    if (d('cbAerial') < 0.5) set('crossEngagement', 'Stop Crosses', 'Their striker wins headers: stop the crosses at the source.');
    if (bestHeader) notes.push(`Let ${bestHeader.name}, your best centre-back in the air, take their target man.`);
  }
  if (traits.has('fastWingers')) {
    if (d('wideDefending') < 0.5) {
      if (values.supportingRuns === 'Both Flanks') set('supportingRuns', 'Balanced', 'Fewer runs from your full-backs: keep them at home against quick wingers.');
      set('pressingTrap', 'Trap Inside', 'Show their wingers inside, into the crowd, instead of letting them run at your full-backs.');
    } else notes.push(`Your wide defending is solid (${f1(v('wideDefending'))}): no special measures against their wingers.`);
  }
  if (traits.has('weakAir')) {
    if (d('aerialAttack') >= 0) {
      set('crossingStyle', 'Floated Crosses', 'They are weak in the air: get crosses into the box.');
      set('playForSetPieces', 'Play for Set Pieces', 'Corners and free kicks are a real chance against a side that struggles in the air.');
    } else notes.push('They are weak in the air, but so are your strikers: use set pieces with your centre-backs going up.');
  }
  if (traits.has('slowCBs')) {
    if (d('fwdPace') >= 0) {
      set('passReception', 'Pass Into Space', `Their centre-backs are slow and your front line isn't (${f1(v('fwdPace'))}): play balls in behind.`);
      step('passingDirectness', 1, 'A little more direct, to get the ball in behind early.');
    } else notes.push('Their centre-backs are slow, but your front line isn’t quick either: keep your usual passing.');
  }

  const chosen = [opp.strength, opp.venue, ...style, ...traits].filter(Boolean).map((k) => LABEL[k]);
  return {
    empty: isEmptyOpponent(opp),
    opponent: opp,
    chosen,
    base,
    mentality,
    changes: [...changes.values()].filter((c) => c.from !== c.to),
    notes,
  };
}
