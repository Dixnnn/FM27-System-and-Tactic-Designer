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
