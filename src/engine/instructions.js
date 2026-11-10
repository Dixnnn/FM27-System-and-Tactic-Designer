// Team instructions, mentality and the closest FM27 style, each with a plain-English reason.
// Inputs: the squad profile of the chosen XI (profile.js), the chosen system and how strong the team is in
// its league. Thresholds are "bands" around the team's own general level (tuning.json "instructions").

const STRENGTH_LABEL = {
  2: 'title favourites',
  1: 'a top-half side',
  0: 'a mid-table side',
  '-1': 'a lower-half side',
  '-2': 'underdogs in most games',
};

export const STRENGTH_OPTIONS = [
  { value: 2, label: 'Title favourites' },
  { value: 1, label: 'Top half' },
  { value: 0, label: 'Mid-table' },
  { value: -1, label: 'Lower half' },
  { value: -2, label: 'Underdogs / relegation fight' },
];

const f1 = (n) => (n == null ? '–' : Number(n).toFixed(1));

function surnames(names, max = 4) {
  const s = names.map((n) => n.split(/\s+/).pop());
  return s.length > max ? `${s.slice(0, max).join(', ')} +${s.length - max}` : s.join(', ');
}

/** "Centre-backs' pace and acceleration: 13.8 (Smith, Jones), 2.2 above your team's level of 11.6." */
function stat(profile, key) {
  const m = profile.metrics[key];
  if (!m || m.value == null) return '';
  const rel = m.delta >= 0.35 ? `${f1(m.delta)} above` : m.delta <= -0.35 ? `${f1(-m.delta)} below` : 'about the same as';
  return `${m.label}: ${f1(m.value)} (${surnames(m.players)}), ${rel} your team's level of ${f1(profile.level)}.`;
}

function roleList(system, phase) {
  return system.lanes.map((l) => (phase === 'IP' ? l.ipRole : l.oopRole));
}

const hasRole = (system, phase, name) => roleList(system, phase).some((r) => r.name === name);
const hasTag = (system, phase, tag) => roleList(system, phase).some((r) => r.tagSet.has(tag));

/**
 * The broad game plan, decided before the final formation search so the shapes can suit it.
 * @param {object} profile  squadProfile()
 * @param {number} strength  -2 (underdogs) .. 2 (favourites)
 */
export function derivePlan(profile, strength, cfg, override = {}) {
  const d = (k) => profile.metrics[k]?.delta ?? 0;
  const press = d('pressing') + cfg.strengthWeight * strength + 0.25 * d('cbPace');
  let lineOfEngagement = press >= cfg.strong ? 'High Press' : press <= -cfg.strong ? 'Low Block' : 'Mid Block';
  // Pressing high in front of slow centre-backs leaves a gap behind them: start the press in a mid block.
  let pressCorrected = false;
  if (lineOfEngagement === 'High Press' && d('cbPace') + 0.3 * d('gkSweeping') + 0.5 <= -cfg.strong) {
    lineOfEngagement = 'Mid Block';
    pressCorrected = true;
  }
  const build = d('buildUp');
  const buildUpStrategy = build >= cfg.strong * 0.8 ? 'Play Through Press' : build <= -cfg.strong * 0.8 ? 'Bypass Press' : 'Balanced';
  const tech = (d('technique') + d('passing') + d('composure')) / 3;
  let attackingTransition = 'Standard';
  if (d('fwdPace') >= cfg.strong * 0.8 && !(lineOfEngagement === 'High Press' && strength >= 1)) attackingTransition = 'Counter-Attack';
  else if (tech >= cfg.strong && d('fwdPace') < 0.5) attackingTransition = 'Hold Shape';
  return { lineOfEngagement, buildUpStrategy, attackingTransition, pressCorrected, pressScore: press, ...override };
}

const STYLE_SIGNS = {
  Gegenpress: { lineOfEngagement: ['High Press'], triggerPress: ['More Often', 'Much More Often'], defensiveTransition: ['Counter-Press'], tempo: ['Higher', 'Much Higher'] },
  'Tiki-Taka': { passingDirectness: ['Shorter', 'Much Shorter'], passReception: ['Pass To Feet'], buildUpStrategy: ['Play Through Press'], attackingTransition: ['Hold Shape'], lineOfEngagement: ['High Press'] },
  'Vertical Tiki-Taka': { passingDirectness: ['Shorter', 'Much Shorter'], tempo: ['Higher', 'Much Higher'], attackingWidth: ['Narrower', 'Much Narrower'], buildUpStrategy: ['Play Through Press'] },
  'Control Possession': { passingDirectness: ['Shorter', 'Much Shorter'], tempo: ['Lower', 'Much Lower'], patience: ['Work Ball Into Box'], buildUpStrategy: ['Play Through Press'], attackingTransition: ['Hold Shape'] },
  'Wing Play': { attackingWidth: ['Wider', 'Much Wider'], patience: ['Hit Early Crosses'], supportingRuns: ['Both Flanks', 'Left', 'Right'], crossingStyle: ['Floated Crosses', 'Whipped Crosses', 'Low Crosses'] },
  'Route One': { passingDirectness: ['More Direct', 'Much More Direct'], buildUpStrategy: ['Bypass Press'], goalKicks: ['Long'], gkDistribution: ['Target Forward'] },
  'Fluid Counter-Attack': { attackingTransition: ['Counter-Attack'], lineOfEngagement: ['Mid Block'], passReception: ['Pass Into Space'], creativeFreedom: ['More Expressive'] },
  'Direct Counter-Attack': { attackingTransition: ['Counter-Attack'], passingDirectness: ['More Direct', 'Much More Direct'], lineOfEngagement: ['Mid Block', 'Low Block'], defensiveTransition: ['Regroup'] },
  Catenaccio: { lineOfEngagement: ['Low Block'], defensiveLine: ['Lower', 'Much Lower'], defensiveTransition: ['Regroup'], mentality: ['Cautious', 'Defensive'] },
  'Park the Bus': { lineOfEngagement: ['Low Block'], defensiveLine: ['Much Lower'], mentality: ['Defensive', 'Very Defensive'], timeWasting: ['More Often'] },
};

function closestStyle(values) {
  let best = null;
  for (const [style, signs] of Object.entries(STYLE_SIGNS)) {
    const keys = Object.keys(signs);
    const hits = keys.filter((k) => signs[k].includes(values[k]));
    const score = hits.length / keys.length;
    if (!best || score > best.score) best = { style, score, hits, total: keys.length };
  }
  return best;
}

const band = (x, S, VS, [muchLow, low, mid, high, muchHigh]) => (x >= VS ? muchHigh : x >= S ? high : x <= -VS ? muchLow : x <= -S ? low : mid);

/**
 * @param {object} profile  squadProfile() of the chosen XI
 * @param {object} system  the chosen system
 * @param {object} ctx  search context (tuning, slots, instructionsDoc)
 * @param {{strength:number, setPieces?:object, planOverride?:object, situation?:string, overrides?:object, extraReasons?:object,
 *          mentality?:string, mentalityReason?:string}} opts
 */
export function decideInstructions(profile, system, ctx, opts = {}) {
  const cfg = ctx.tuning.instructions;
  const S = cfg.strong;
  const VS = cfg.veryStrong;
  const strength = Math.max(-2, Math.min(2, Number(opts.strength) || 0));
  const strengthLabel = STRENGTH_LABEL[strength];
  const d = (k) => profile.metrics[k]?.delta ?? 0;
  const st = (k) => stat(profile, k);
  const values = {};
  const reasons = {};
  const set = (id, value, reason) => {
    values[id] = value;
    reasons[id] = reason;
  };
  const plan = derivePlan(profile, strength, cfg, opts.planOverride);

  // ---------- Out of possession ----------
  const engagement = plan.lineOfEngagement;
  const asSide = opts.situation ? ` ${opts.situation}` : strength ? ` As ${strengthLabel}, ${strength > 0 ? 'you will often want to win the ball back high up' : 'you will often face better teams'}.` : '';
  if (plan.pressCorrected) {
    set('lineOfEngagement', engagement, `${st('pressing')} That is enough to press high, but your centre-backs lack pace (see Defensive Line). Pressing high in front of them would leave a big gap, so the press starts in a mid block.`);
  } else if (engagement === 'High Press') {
    set('lineOfEngagement', engagement, `${st('pressing')} ${d('cbPace') >= S ? `With quick centre-backs behind them (${f1(profile.metrics.cbPace.value)}), the team can squeeze high and cover the space left behind.` : 'The team has the legs to press high.'}${asSide}`);
  } else if (engagement === 'Low Block') {
    set('lineOfEngagement', engagement, `${st('pressing')} A deeper block saves energy and keeps the team compact.${asSide}`);
  } else {
    set('lineOfEngagement', engagement, `${st('pressing')} A mid block balances pressing with protecting the space behind.${asSide}`);
  }

  const lineScore = d('cbPace') + 0.3 * d('gkSweeping') + (engagement === 'High Press' ? 0.5 : engagement === 'Low Block' ? -0.5 : 0);
  let line = band(lineScore, S, 2.5, ['Much Lower', 'Lower', 'Standard', 'Higher', 'Much Higher']);
  if (engagement === 'High Press' && line.includes('Lower')) line = 'Standard';
  set('defensiveLine', line,
    line.includes('Higher')
      ? `${st('cbPace')} Quick centre-backs can hold a high line and squeeze the space between the lines.`
      : line.includes('Lower')
        ? `${st('cbPace')} Slower centre-backs need a deeper line, so balls over the top don't leave them racing back.`
        : `${st('cbPace')} A standard line is safe.`);

  if (d('cbReading') >= S && d('cbPace') >= -0.5) set('defensiveLineBehaviour', 'Step Up More', `${st('cbReading')} They can step up together and catch attackers offside.`);
  else if (d('cbPace') <= -S) set('defensiveLineBehaviour', 'Drop Off More', 'Your centre-backs lack pace: dropping off is safer than stepping up into space they can be run in behind.');
  else set('defensiveLineBehaviour', 'Balanced', `${st('cbReading')} No reason to change how the line steps up.`);

  let trigger = band(d('pressing') + 0.3 * strength, S, VS, ['Much Less Often', 'Less Often', 'Standard', 'More Often', 'Much More Often']);
  let triggerWhy = st('pressing');
  if (engagement === 'Low Block' && /More Often/.test(trigger)) {
    trigger = 'Standard';
    triggerWhy += ' In a low block they hold their shape rather than chase the ball.';
  }
  if (/More Often/.test(trigger) && d('stamina') <= -S) {
    trigger = trigger === 'Much More Often' ? 'More Often' : 'Standard';
    triggerWhy += ` But stamina is a weak point (${f1(profile.metrics.stamina.value)}), so the pressing is toned down to last 90 minutes.`;
  }
  if (engagement === 'High Press' && /Less Often/.test(trigger)) trigger = 'Standard';
  set('triggerPress', trigger, triggerWhy);

  if (d('pressing') >= S && d('stamina') >= -0.3 && engagement !== 'Low Block') {
    set('defensiveTransition', 'Counter-Press', `${st('pressing')} A high-energy side should win the ball straight back while the opponent is disorganised.`);
  } else if (engagement === 'Low Block' || d('pressing') <= -0.5) {
    set('defensiveTransition', 'Regroup', 'When the ball is lost, get back into shape: chasing it with this squad would open gaps.');
  } else {
    set('defensiveTransition', 'Standard', 'Pressing is neither a big strength nor a weakness, so leave it standard.');
  }

  if (d('tackling') >= S && d('aggression') >= 0.5) set('tackling', 'Get Stuck In', `${st('tackling')} Your defenders are also aggressive, so let them win the ball firmly.`);
  else if (d('tackling') <= -S || (d('aggression') >= 1.5 && d('composure') <= -S)) set('tackling', 'Stay On Feet', `${st('tackling')} Staying on their feet avoids fouls and cards.`);
  else set('tackling', 'Standard', `${st('tackling')} Standard tackling.`);

  const wide = profile.metrics.wideDefending;
  const central = profile.metrics.centralDefending;
  const trapDiff = (wide?.value ?? 0) - (central?.value ?? 0);
  if (wide?.players.length >= 2 && trapDiff >= S) {
    set('pressingTrap', 'Trap Outside', `Your wide players defend better (${f1(wide.value)}) than your central ones (${f1(central.value)}), so push the opponent's play out to the touchline where they can win it.`);
  } else if (trapDiff <= -S) {
    set('pressingTrap', 'Trap Inside', `Your central players defend better (${f1(central.value)}) than your wide ones (${f1(wide?.value)}), so force play into the middle.`);
  } else {
    set('pressingTrap', 'Balanced', `Wide (${f1(wide?.value)}) and central (${f1(central?.value)}) defending are about even, so don't steer the press either way.`);
  }

  const heightNote = profile.cbHeight ? ` Average height ${Math.round(profile.cbHeight)} cm.` : '';
  const aerial = d('cbAerial') + ((profile.cbHeight || 185) - 185) / 5 + 0.3 * d('gkAerial');
  if (aerial >= 1.5) set('crossEngagement', 'Invite Crosses', `${st('cbAerial')}${heightNote} Let opponents cross into areas you dominate.`);
  else if (aerial <= -S) set('crossEngagement', 'Stop Crosses', `${st('cbAerial')}${heightNote} Stop crosses at source rather than defend them in the box.`);
  else set('crossEngagement', 'Balanced', `${st('cbAerial')}${heightNote} No need to invite or stop crosses.`);
  set('preventShortGkDistribution', engagement === 'High Press' ? 'Yes' : 'No',
    engagement === 'High Press' ? 'Part of pressing high: stop the goalkeeper rolling it out short.' : 'Not pressing high, so let the keeper play short while your block sets up.');

  // ---------- Mentality ----------
  const attackEdge = (d('finishing') + d('technique') + d('creativity')) / 3;
  let mentality = ['Defensive', 'Cautious', 'Balanced', 'Positive', 'Positive'][strength + 2];
  if (strength === 2 && attackEdge >= S) mentality = 'Attacking';
  if (strength === 1 && attackEdge <= -S) mentality = 'Balanced';
  if (strength === -1 && d('pressing') >= S) mentality = 'Balanced';
  if (strength === -2 && engagement !== 'Low Block') mentality = 'Cautious';
  if (engagement === 'Low Block' && ['Positive', 'Attacking'].includes(mentality)) mentality = 'Balanced';
  const mentalityWhy = `You said the team is ${strengthLabel}${mentality === 'Attacking' ? ', and the attack is a clear strength' : ''}. Raise it a step when you need a goal and lower it to protect a lead.`;

  // ---------- In possession: Overview ----------
  const tech = (d('passing') + d('technique') + d('composure')) / 3;
  const hasTF = hasRole(system, 'IP', 'Target Forward');
  const counter = plan.attackingTransition === 'Counter-Attack';
  const directness = -tech - 0.3 * d('buildUp') + (hasTF ? 0.8 : 0) + (counter ? 0.8 : 0);
  let pd = band(directness, S * 0.8, VS, ['Much Shorter', 'Shorter', 'Standard', 'More Direct', 'Much More Direct']);
  if (counter && pd === 'Much Shorter') pd = 'Shorter';
  set('passingDirectness', pd,
    pd.includes('Shorter')
      ? `${st('passing')} ${st('technique')} This side can keep the ball${counter ? ', even when it breaks quickly' : ''}.`
      : pd.includes('Direct')
        ? `${st('passing')}${hasTF ? ' You also have a Target Forward to aim at.' : ''} Get the ball forward quickly rather than risk losing it in your own half.`
        : `${st('passing')} A normal mix of short and long passes.`);

  let tempo = 'Standard';
  let tempoWhy = 'No strong reason to speed up or slow down the build-up.';
  if (counter || (engagement === 'High Press' && d('pressing') >= S)) {
    tempo = 'Higher';
    tempoWhy = `${st('fwdPace')} Move the ball quickly before opponents set up.`;
    if (d('composure') <= -S) {
      tempo = 'Standard';
      tempoWhy += ` But composure is a weak point (${f1(profile.metrics.composure.value)}), so a standard tempo cuts mistakes.`;
    }
  } else if (pd.includes('Shorter') && d('fwdPace') < 0) {
    tempo = 'Lower';
    tempoWhy = 'A patient, short-passing side whose front line is not especially quick: take time to open teams up.';
  }
  set('tempo', tempo, tempoWhy);

  const ipLanes = system.lanes.filter((l) => l.ip !== 'GK');
  const sideOf = (l) => (ctx.slots[l.ip][0] < 30 ? 'L' : ctx.slots[l.ip][0] > 70 ? 'R' : 'C');
  const widthBy = (side) => ipLanes.filter((l) => sideOf(l) === side && l.ipRole.tagSet.has('width'));
  const wideL = widthBy('L');
  const wideR = widthBy('R');
  if (wideL.length && wideR.length && d('crossing') >= 0.5) {
    set('attackingWidth', 'Wider', `You have width on both flanks (${surnames([...wideL, ...wideR].map((l) => l.player.name))}). ${st('crossing')} Stretch the pitch.`);
  } else if (!wideL.length && !wideR.length) {
    set('attackingWidth', 'Narrower', 'Nobody in the side is asked to stay wide, so play narrow and overload the middle.');
  } else {
    set('attackingWidth', 'Standard', 'The roles already give this side the width it needs.');
  }

  const at = plan.attackingTransition;
  set('attackingTransition', at,
    at === 'Counter-Attack'
      ? `${st('fwdPace')} Break forward as soon as you win the ball.`
      : at === 'Hold Shape'
        ? `${st('technique')} A technical side whose front line isn't especially quick: keep the ball and build up rather than rush forward.`
        : 'Neither a quick front line nor a possession side: let the players choose when to break.');

  const cf = (d('dribbling') + d('composure')) / 2;
  if (cf >= S) set('creativeFreedom', 'More Expressive', `${st('dribbling')} ${st('composure')} Give them freedom to improvise.`);
  else if (cf <= -S || (profile.youngShare >= 0.6 && d('composure') <= -0.5)) {
    set('creativeFreedom', 'More Disciplined', `${st('composure')}${profile.youngShare >= 0.6 ? ' In a young side,' : ''} A clear structure helps.`);
  } else set('creativeFreedom', 'Balanced', 'A normal amount of freedom suits this squad.');
  set('timeWasting', 'Standard', 'Switch to More Often only when protecting a lead late on.');

  const aerialTargets = opts.setPieces?.aerialTargets || [];
  const bestCorner = opts.setPieces?.cornerTaker;
  const top3 = aerialTargets.slice(0, 3);
  const setPieceThreat = top3.length >= 2 && top3.reduce((s, t) => s + t.delta, 0) / top3.length >= 2.5;
  if (setPieceThreat && bestCorner && bestCorner.value >= profile.level + 2) {
    set('playForSetPieces', 'Play for Set Pieces', `Strong aerial targets (${surnames(top3.map((t) => t.name))}) and good delivery from ${bestCorner.name.split(' ').pop()} (Corners ${bestCorner.corners}).`);
  } else {
    set('playForSetPieces', 'Keep Ball in Play', 'Set pieces are not a big enough weapon to play for them.');
  }

  // ---------- In possession: Final Third ----------
  if ((d('creativity') >= S || tech >= S) && d('longShots') <= 0.5) {
    set('patience', 'Work Ball Into Box', `${st('creativity')} Without a real long-range threat, work the ball into the box for better chances.`);
  } else if (d('crossing') >= S && (d('aerialAttack') >= S || hasTF)) {
    set('patience', 'Hit Early Crosses', `${st('crossing')} ${st('aerialAttack')} Deliver crosses early.`);
  } else {
    set('patience', 'Standard', 'A normal mix of patience and early crosses.');
  }
  const ls = d('longShots');
  set('shotsFromDistance', ls >= 1.5 ? 'Encourage' : ls <= -1.5 ? 'Discourage' : 'Balanced',
    `${st('longShots')}${ls >= 1.5 ? ' Let them shoot.' : ls <= -1.5 ? ' Wait for better chances.' : ''}`);

  const crossers = ipLanes.filter((l) => l.ipRole.tagSet.has('crosser')).length;
  let cs = 'Balanced';
  let csWhy = crossers ? 'No clear reason to prefer one type of cross.' : 'Few players are asked to cross, so leave it balanced.';
  if (crossers >= 1) {
    if (d('aerialAttack') >= 1.5 || (profile.strikerHeight || 0) >= 188) {
      cs = d('crossing') >= S ? 'Whipped Crosses' : 'Floated Crosses';
      csWhy = `${st('aerialAttack')}${profile.strikerHeight ? ` Height ${Math.round(profile.strikerHeight)} cm.` : ''} Give him crosses he can attack in the air.`;
    } else if (d('aerialAttack') <= -S && d('fwdPace') >= 0.5) {
      cs = 'Low Crosses';
      csWhy = `${st('aerialAttack')} Your forwards are quicker than they are strong in the air: keep crosses low.`;
    }
  }
  set('crossingStyle', cs, csWhy);
  const dr = d('dribbling');
  set('dribbling', dr >= 1.2 ? 'Encourage' : dr <= -1.2 ? 'Discourage' : 'Balanced',
    `${st('dribbling')}${dr >= 1.2 ? ' Let them run at defenders.' : dr <= -1.2 ? ' Move the ball instead.' : ''}`);

  // ---------- In possession: Progression ----------
  const attackingBack = (side) => ipLanes.some((l) => sideOf(l) === side && /^(D|WB)/.test(ctx.slots[l.ip][2]) && l.ipRole.tagSet.has('attackingBack'));
  const runL = attackingBack('L');
  const runR = attackingBack('R');
  set('supportingRuns', runL && runR ? 'Both Flanks' : runL ? 'Left' : runR ? 'Right' : 'Balanced',
    runL || runR
      ? `Your ${runL && runR ? 'full-backs/wing-backs on both sides have' : runL ? 'left full-back/wing-back has' : 'right full-back/wing-back has'} an attacking role, so support the attack down ${runL && runR ? 'both flanks' : 'that side'}.`
      : 'No attacking full-backs or wing-backs: leave supporting runs balanced.');
  const sideValue = (side) => {
    const xs = ipLanes.filter((l) => sideOf(l) === side);
    return xs.length ? xs.reduce((s, l) => s + l.ipScore.score, 0) / xs.length : null;
  };
  const L = sideValue('L');
  const R = sideValue('R');
  const C = sideValue('C');
  let pt = 'Balanced';
  let ptWhy = `Your left (fit ${f1(L)}), centre (${f1(C)}) and right (${f1(R)}) are about equally strong.`;
  if (L != null && R != null && L - R >= 5) [pt, ptWhy] = ['Left', `Your left side is clearly stronger (fit ${f1(L)} against ${f1(R)} on the right).`];
  else if (L != null && R != null && R - L >= 5) [pt, ptWhy] = ['Right', `Your right side is clearly stronger (fit ${f1(R)} against ${f1(L)} on the left).`];
  else if (C != null && C - Math.max(L ?? 0, R ?? 0) >= 5) [pt, ptWhy] = ['Middle', `Your central players are clearly the strongest (fit ${f1(C)}).`];
  set('progressThrough', pt, ptWhy);
  if (d('fwdPace') >= S && d('fwdMovement') >= 0) set('passReception', 'Pass Into Space', `${st('fwdPace')} ${st('fwdMovement')} Play balls into space for them to run onto.`);
  else if (tech >= S && d('fwdPace') <= 0) set('passReception', 'Pass To Feet', `${st('technique')} The forwards aren't especially quick, so pass to feet.`);
  else set('passReception', 'Balanced', `${st('fwdMovement')} A mix of passes to feet and into space.`);

  // ---------- In possession: Build-Up ----------
  let bu = plan.buildUpStrategy;
  let buWhy =
    bu === 'Play Through Press'
      ? `${st('buildUp')} They are comfortable playing out under pressure.`
      : bu === 'Bypass Press'
        ? `${st('buildUp')} Playing out from the back is risky for them: go around the press.`
        : `${st('buildUp')} A balanced build-up.`;
  if (bu === 'Play Through Press' && d('gkDistribution') <= -VS) {
    bu = 'Balanced';
    buWhy += ` But the goalkeeper is weak with the ball (${f1(profile.metrics.gkDistribution.value)}), so keep it balanced.`;
  }
  set('buildUpStrategy', bu, buWhy);
  const aerialStriker = hasTF || d('aerialAttack') >= S;
  set('goalKicks', bu === 'Play Through Press' ? 'Short' : bu === 'Bypass Press' && aerialStriker ? 'Long' : 'Mixed',
    bu === 'Play Through Press' ? 'Goes with playing through the press.' : bu === 'Bypass Press' && aerialStriker ? 'Goes with bypassing the press: aim at a striker who wins headers.' : 'A mix keeps opponents guessing.');
  set('gkDistributionSpeed', at === 'Counter-Attack' ? 'Distribute Quickly' : at === 'Hold Shape' ? 'Slow Pace Down' : 'Balanced',
    at === 'Counter-Attack' ? 'Start counter-attacks before the opponent recovers.' : at === 'Hold Shape' ? 'Let the team settle into shape before building up.' : 'No need to hurry or slow the keeper.');
  let gk = 'Balanced';
  let gkWhy = 'Let the keeper pick the best option.';
  if (bu === 'Bypass Press' && aerialStriker) [gk, gkWhy] = ['Target Forward', 'Goes with bypassing the press: find the striker who wins headers.'];
  else if (bu === 'Play Through Press' && hasTag(system, 'IP', 'distributor')) [gk, gkWhy] = ['Centre-Backs', 'Your ball-playing centre-backs start the build-up.'];
  else if (bu !== 'Bypass Press' && system.lanes.some((l) => ['DM', 'M (C)'].includes(ctx.slots[l.ip][2]) && l.ipRole.tagSet.has('creator'))) [gk, gkWhy] = ['Playmaker', 'Get the ball to your deep playmaker early.'];
  else if (at === 'Counter-Attack' && d('fwdPace') >= VS) [gk, gkWhy] = ['Flanks', 'Release your quick wide players early.'];
  set('gkDistribution', gk, gkWhy);

  // ---------- built around your marquee players ----------
  const builtAround = [];
  const marquee = system.lanes.filter((l) => l.player.label === 'marquee');
  const wideSides = new Set();
  for (const lane of marquee) {
    const p = lane.player;
    const nm = p.name.split(/\s+/).pop();
    const a = (k) => p.attrs[k]?.v ?? 0;
    const lvl = profile.level ?? 10;
    const pos = ctx.slots[lane.ip][2];
    const x = ctx.slots[lane.ip][0];
    const side = x < 30 ? 'L' : x > 70 ? 'R' : 'C';
    const attacking = /^(AM|ST)/.test(pos) || /^M \((L|R)\)/.test(pos);
    const tweak = (id, value, why) => {
      const text = `Built around ${nm}: ${why}`;
      if (values[id] !== value) set(id, value, text);
      else reasons[id] = `${text} ${reasons[id]}`;
      builtAround.push({ player: p, id, value, why });
    };
    if (side !== 'C' && (attacking || lane.ipRole.tagSet.has('attackingBack'))) wideSides.add(side);
    if (lane.ipRole.tagSet.has('creator') && ['DM', 'M (C)'].includes(pos) && values.buildUpStrategy !== 'Bypass Press') {
      tweak('gkDistribution', 'Playmaker', 'get the ball to your playmaker as early as possible.');
    }
    if (lane.ipRole.tagSet.has('distributor') && pos === 'D (C)' && a('Passing') >= lvl + 2) {
      tweak('buildUpStrategy', 'Play Through Press', `his passing (${a('Passing')}) is good enough to start attacks from the back.`);
    }
    if ((pos === 'ST (C)' || pos.startsWith('AM')) && (a('Pace') + a('Acceleration')) / 2 >= lvl + 2) {
      tweak('passReception', 'Pass Into Space', `use his pace (Pace ${a('Pace')}, Acceleration ${a('Acceleration')}) with balls in behind.`);
    }
    if (pos === 'ST (C)' && ((a('Heading') + a('Jumping Reach')) / 2 >= lvl + 2.5 || ((p.heightCm || 0) >= 188 && a('Heading') >= lvl + 1))) {
      tweak('crossingStyle', d('crossing') >= S ? 'Whipped Crosses' : 'Floated Crosses', `give him crosses to attack (Heading ${a('Heading')}${p.heightCm ? `, ${p.heightCm} cm` : ''}).`);
    }
    if (attacking && (a('Dribbling') + a('Flair')) / 2 >= lvl + 3) {
      tweak('dribbling', 'Encourage', `let him run at defenders (Dribbling ${a('Dribbling')}, Flair ${a('Flair')}).`);
      tweak('creativeFreedom', 'More Expressive', 'give him freedom to make things happen.');
    }
    if (['DM', 'M (C)', 'AM (C)', 'AM (L)', 'AM (R)'].includes(pos) && a('Long Shots') >= lvl + 3) {
      tweak('shotsFromDistance', 'Encourage', `he can score from distance (Long Shots ${a('Long Shots')}).`);
    }
  }
  if (wideSides.size) {
    const value = wideSides.size === 2 ? 'Both Flanks' : wideSides.has('L') ? 'Left' : 'Right';
    const who = marquee.filter((l) => {
      const x = ctx.slots[l.ip][0];
      return x < 30 || x > 70;
    });
    const nm = who.map((l) => l.player.name.split(/\s+/).pop()).join(' and ');
    const text = `Built around ${nm}: get the ball to ${who.length > 1 ? 'them' : 'him'} on ${value === 'Both Flanks' ? 'both flanks' : `the ${value.toLowerCase()} flank`}.`;
    if (values.progressThrough !== value) set('progressThrough', value, text);
    builtAround.push({ player: who[0].player, id: 'progressThrough', value, why: text });
  } else if (marquee.some((l) => ['DM', 'M (C)', 'AM (C)'].includes(ctx.slots[l.ip][2]) && l.ipRole.tagSet.has('creator'))) {
    const l = marquee.find((m) => ['DM', 'M (C)', 'AM (C)'].includes(ctx.slots[m.ip][2]) && m.ipRole.tagSet.has('creator'));
    const text = `Built around ${l.player.name.split(/\s+/).pop()}: play through the middle, where he is.`;
    if (values.progressThrough !== 'Middle') set('progressThrough', 'Middle', text);
    builtAround.push({ player: l.player, id: 'progressThrough', value: 'Middle', why: text });
  }

  // ---------- overrides (alternative tactics) ----------
  for (const [id, val] of Object.entries(opts.overrides || {})) {
    if (val == null) continue;
    values[id] = val;
    reasons[id] = (opts.extraReasons || {})[id] || reasons[id];
  }
  let mentalityReason = mentalityWhy;
  if (opts.mentality) {
    mentality = opts.mentality;
    mentalityReason = opts.mentalityReason || mentalityWhy;
  }

  const catalogue = ctx.instructionsDoc;
  const build = (list) =>
    list.map((item) => ({
      ...item,
      value: values[item.id] ?? item.default,
      changed: (values[item.id] ?? item.default) !== item.default,
      reason: reasons[item.id] || '',
    }));
  const style = closestStyle({ ...values, mentality });
  return {
    mentality: { value: mentality, reason: mentalityReason },
    style: {
      value: style.score >= 0.5 ? style.style : null,
      hits: style.hits,
      reason:
        style.score >= 0.5
          ? `Its preset is the closest to the settings below (${style.hits.length} of its ${style.total} key settings match). Pick it as a starting point, then change the settings below; FM27 will call it "Custom ${style.style}".`
          : 'No preset style is a close match. Pick any style as a starting point, then set everything below; FM27 will mark it as Custom.',
    },
    ip: build(catalogue.inPossession),
    oop: build(catalogue.outOfPossession),
    values: { ...values, mentality },
    builtAround,
    plan,
    strength,
    strengthLabel,
  };
}
