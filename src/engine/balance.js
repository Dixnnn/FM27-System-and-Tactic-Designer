// Team balance: points added to or taken from a system's score, so the tool doesn't just stack
// the eleven highest numbers. Point values live in data/tuning.json ("balance").

const CENTRAL_MID = new Set(['DM', 'M (C)', 'AM (C)']);
const DEEP_MID = new Set(['DM', 'M (C)']);

/**
 * @param {Array<{ip:string, oop:string, ipRole:object, oopRole:object}>} lanes
 * @param {object} slots  formations.json "slots"
 * @param {object} cfg  tuning.balance
 * @returns {{points:number, notes:Array<{points:number, text:string}>}}
 */
export function evaluateBalance(lanes, slots, cfg) {
  const notes = [];
  const add = (points, text) => {
    if (points) notes.push({ points, text });
  };
  const ip = lanes.map((l) => ({ role: l.ipRole, slot: l.ip, pos: slots[l.ip][2], x: slots[l.ip][0] }));
  const oop = lanes.map((l) => ({ role: l.oopRole, slot: l.oop, pos: slots[l.oop][2], x: slots[l.oop][0] }));
  const has = (list, tag, filter = () => true) => list.filter((e) => e.role && e.role.tagSet.has(tag) && filter(e));
  const named = (list, name) => list.filter((e) => e.role && e.role.name === name);

  // Cover behind attacking full-backs / wing-backs
  const attackingBacks = has(ip, 'attackingBack');
  const holders = has(ip, 'holder');
  const centreBacksIP = ip.filter((e) => e.pos === 'D (C)').length;
  if (attackingBacks.length >= 2 && !holders.length && centreBacksIP < 3) {
    add(cfg.attackingBacksWithoutCover, 'Two attacking full-backs/wing-backs with no holding midfielder or back three behind them.');
  }

  // Creativity and ball-winning in midfield
  const creators = has(ip, 'creator');
  const midCreators = creators.filter((e) => CENTRAL_MID.has(e.pos));
  const midWinners = has(oop, 'ballWinner', (e) => DEEP_MID.has(e.pos));
  const midScreens = has(oop, 'screen', (e) => DEEP_MID.has(e.pos));
  if (!creators.length) add(cfg.noCreator, 'No playmaker anywhere in the side: chances will be hard to create.');
  if (midCreators.length && midWinners.length) add(cfg.creatorAndBallWinner, 'Midfield has both a playmaker and a ball-winner.');
  if (!midWinners.length) add(cfg.noBallWinnerInMidfield, 'No pressing ball-winner in central midfield out of possession.');
  if (!midScreens.length && !holders.length) add(cfg.noScreenOrHolder, 'Nobody shields the back line (no screening or holding midfielder).');
  if (creators.length > cfg.maxCreators) {
    add(cfg.tooManyCreatorsEach * (creators.length - cfg.maxCreators), `${creators.length} playmakers: too many players asking for the ball in the same spaces.`);
  }
  const freeRoles = named(ip, 'Free Role');
  if (freeRoles.length > 1) add(cfg.duplicateFreeRoleEach * (freeRoles.length - 1), 'More than one Free Role.');
  for (const name of ['Half Back']) {
    const n = named(ip, name).length;
    if (n > 1) add(cfg.duplicateHalfBackOrDroppingEach * (n - 1), `More than one ${name}.`);
  }
  const dropping = named(oop, 'Dropping Defensive Midfielder').length;
  if (dropping > 1) add(cfg.duplicateHalfBackOrDroppingEach * (dropping - 1), 'More than one Dropping Defensive Midfielder.');

  // Width on both flanks in possession
  for (const [side, test] of [['left', (e) => e.x < 30], ['right', (e) => e.x > 70]]) {
    const wide = ip.filter(test);
    if (wide.length && !wide.some((e) => e.role && e.role.tagSet.has('width'))) {
      add(cfg.flankWithoutWidth, `Nobody stays wide on the ${side} in possession.`);
    } else if (!wide.length) {
      add(cfg.flankWithoutWidth, `No player is positioned on the ${side} flank in possession.`);
    }
  }

  // Strikers need the right supply
  const crossers = has(ip, 'crosser');
  const runners = has(ip, 'runner');
  if (named(ip, 'Target Forward').length && crossers.length < 2) {
    add(cfg.targetForwardWithoutCrossers, 'Target Forward with fewer than two crossers to supply him.');
  }
  if (named(ip, 'False Nine').length && runners.length < 2) {
    add(cfg.falseNineWithoutRunners, 'False Nine without at least two runners to use the space he creates.');
  }
  if (!has(ip, 'finisher').length) add(cfg.noFinisher, 'No natural goalscorer role in the side.');

  // Out of possession
  const outlets = has(oop, 'outlet');
  if (outlets.length > cfg.maxOutlets) {
    add(cfg.tooManyOutletsEach * (outlets.length - cfg.maxOutlets), `${outlets.length} players stay forward as outlets: too few defend.`);
  }
  const stoppers = has(oop, 'stopper');
  const covers = has(oop, 'cover', (e) => e.pos === 'D (C)');
  if (stoppers.length && covers.length) add(cfg.stopperAndCoverPair, 'Centre-backs pair a stopper with a covering defender.');
  if (stoppers.length >= 2 && !covers.length) add(cfg.twoStoppersNoCover, 'Two stopping centre-backs and no cover behind them.');

  const points = notes.reduce((s, n) => s + n.points, 0);
  return { points, notes };
}

/** Rows of an out-of-possession shape: how many players sit in midfield and up front. */
export function oopRows(lanes, slots) {
  let mid = 0;
  let front = 0;
  for (const l of lanes) {
    const y = slots[l.oop][1];
    if (l.oop === 'GK' || y < 30) continue;
    if (y >= 62) front++;
    else mid++;
  }
  return { mid, front };
}

/**
 * Does the system suit the game plan? A high press wants a front three out of possession and players who
 * press; a mid or low block wants a compact midfield line of four or five; playing through the press wants
 * ball-playing defenders; bypassing it wants a target to aim at. Point values: tuning.json "plan".
 */
export function evaluatePlan(lanes, slots, plan, cfg) {
  const notes = [];
  const add = (points, text) => {
    if (points) notes.push({ points, text });
  };
  const ip = lanes.map((l) => l.ipRole).filter(Boolean);
  const oop = lanes.map((l) => l.oopRole).filter(Boolean);
  const count = (list, tags) => list.filter((r) => tags.some((t) => r.tagSet.has(t))).length;
  const { mid, front } = oopRows(lanes, slots);
  const capped = (n) => Math.min(cfg.roleCap, n * cfg.roleEach);

  if (plan.lineOfEngagement === 'High Press') {
    if (front >= 3) add(cfg.shapeMatch, 'Out of possession it keeps three players high, which suits pressing high.');
    else if (front <= 1) add(cfg.shapeMismatch, 'Only one player stays high out of possession: hard to press high from this shape.');
    add(capped(count(oop, ['presser', 'tracker'])), 'Pressing and tracking roles suit a high press.');
    const outlets = count(oop, ['outlet']);
    if (outlets > 1) add(cfg.extraOutletEach * (outlets - 1), 'Outlet roles rest instead of pressing.');
  } else if (plan.lineOfEngagement === 'Low Block') {
    if (mid >= 4 && front <= 2) add(cfg.shapeMatch, 'Out of possession it forms a compact midfield line, which suits a low block.');
    else if (front >= 3) add(cfg.shapeMismatch, 'Three players stay high out of possession, leaving a low block short of bodies.');
    add(capped(count(oop, ['cover', 'screen'])), 'Covering and screening roles suit a low block.');
  } else if (mid >= 4) {
    add(cfg.shapeMatch / 3, 'A compact midfield line of four or more suits a mid block.');
  }

  if (plan.buildUpStrategy === 'Play Through Press') {
    add(Math.min(cfg.distributorCap, count(ip, ['distributor']) * cfg.distributorEach), 'Ball-playing goalkeeper/centre-backs suit playing through the press.');
    if (lanes.some((l) => ['DM', 'M (C)'].includes(slots[l.ip][2]) && l.ipRole?.tagSet.has('creator'))) add(cfg.deepCreator, 'A deep playmaker helps play through the press.');
  } else if (plan.buildUpStrategy === 'Bypass Press' && count(ip, ['target', 'aerial'])) {
    add(cfg.targetForBypass, 'A striker who wins headers gives long balls a target.');
  }
  if (plan.attackingTransition === 'Counter-Attack') {
    add(capped(count(ip, ['runner'])), 'Runners in behind suit counter-attacks.');
  } else if (plan.attackingTransition === 'Hold Shape') {
    add(capped(count(ip, ['creator', 'link'])), 'Creators and link players suit keeping the ball.');
  }
  return { points: notes.reduce((s, n) => s + n.points, 0), notes: notes.map((n) => ({ ...n, plan: true })) };
}
