// Player instructions: only where a player's attributes or traits clearly justify one.
// FM27's player instruction labels are the least certain names in the tool; the report says so.

const val = (p, a) => p.attrs[a]?.v ?? null;
const avg = (p, attrs) => {
  const vs = attrs.map((a) => val(p, a)).filter((v) => v != null);
  return vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : null;
};
const hasTrait = (p, re) => p.traits.some((t) => re.test(t));

/**
 * @returns {Array<{lane, player, items: Array<{phase, name, value, reason}>}>}
 */
export function playerInstructions(system, profile, instructions, ctx) {
  const level = profile.level ?? 10;
  const S = ctx.tuning.instructions.strong;
  const out = [];
  for (const lane of system.lanes) {
    if (lane.ip === 'GK') continue;
    const p = lane.player;
    const items = [];
    const add = (phase, name, value, reason) => items.push({ phase, name, value, reason });
    const ipPos = ctx.slots[lane.ip][2];
    const side = ctx.slots[lane.ip][0] < 30 ? 'L' : ctx.slots[lane.ip][0] > 70 ? 'R' : 'C';
    const role = lane.ipRole;
    const attackingMid = /^(M|AM) /.test(ipPos) || ipPos === 'ST (C)' || ['Box-To-Box Midfielder', 'Box-To-Box Playmaker'].includes(role.name);

    // Shooting
    const ls = val(p, 'Long Shots');
    if (ls != null && attackingMid && ls >= level + 3 && ls >= 13) add('IP', 'Shooting', 'Shoot More Often', `Long Shots ${ls}, well above the team level.`);
    else if (ls != null && attackingMid && ls <= level - 3 && hasTrait(p, /long range shots|shoots from distance/i)) {
      add('IP', 'Shooting', 'Shoot Less Often', `He likes shooting from distance (trait) but Long Shots is only ${ls}.`);
    }

    // Dribbling direction and frequency for wide players
    if (side !== 'C' && /^(D|WB|M|AM) /.test(ipPos)) {
      const sameFoot = side === 'L' ? p.leftFoot : p.rightFoot;
      const otherFoot = side === 'L' ? p.rightFoot : p.leftFoot;
      if (role.tagSet.has('inside') && otherFoot != null && otherFoot >= 0.7 && (val(p, 'Dribbling') ?? 0) >= level) {
        add('IP', 'Dribbling Direction', 'Cut Inside With Ball', `Plays on the ${side === 'L' ? 'left' : 'right'} with a strong ${side === 'L' ? 'right' : 'left'} foot.`);
      } else if (role.tagSet.has('width') && /^(M|AM) /.test(ipPos) && sameFoot != null && sameFoot >= 0.7 && (val(p, 'Crossing') ?? 0) >= level) {
        add('IP', 'Dribbling Direction', 'Run Wide With Ball', `Natural ${side === 'L' ? 'left' : 'right'}-footer who crosses well (Crossing ${val(p, 'Crossing')}).`);
      }
    }
    const dribble = avg(p, ['Dribbling', 'Flair']);
    if (dribble != null && /^(M|AM|ST) /.test(ipPos)) {
      if (dribble >= level + 3) add('IP', 'Dribbling Frequency', 'Dribble More', `Dribbling ${val(p, 'Dribbling')}, Flair ${val(p, 'Flair')}.`);
      else if (dribble <= level - 3 && (role.tagSet.has('width') || role.tagSet.has('inside'))) add('IP', 'Dribbling Frequency', 'Dribble Less', `Dribbling ${val(p, 'Dribbling')} is a weakness: move the ball on.`);
    }

    // Passing risk
    const vis = val(p, 'Vision');
    const pas = val(p, 'Passing');
    if (vis != null && pas != null && vis >= level + 3 && pas >= level + 2 && (role.tagSet.has('creator') || role.tagSet.has('distributor'))) {
      add('IP', 'Passing Risk', 'Take More Risks', `Vision ${vis}, Passing ${pas}: let him try the killer ball.`);
    } else if (pas != null && pas <= level - 2.5 && (role.tagSet.has('creator') || role.tagSet.has('distributor') || ipPos === 'D (C)')) {
      add('IP', 'Passing Risk', 'Take Fewer Risks', `Passing ${pas} is low for his role: keep it simple.`);
    }

    // Hold up ball for strikers
    if (ipPos === 'ST (C)') {
      const hold = avg(p, ['Strength', 'Balance', 'First Touch']);
      if (hold != null && hold >= level + 2 && !role.tagSet.has('runner')) add('IP', 'Hold Up Ball', 'Yes', `Strength ${val(p, 'Strength')}, Balance ${val(p, 'Balance')}, First Touch ${val(p, 'First Touch')}: he can hold the ball up for runners.`);
    }

    // Crossing position for wide crossers
    if (role.tagSet.has('crosser') && side !== 'C') {
      const quick = avg(p, ['Pace', 'Acceleration', 'Dribbling']);
      const cross = val(p, 'Crossing');
      if (quick != null && cross != null && quick >= level + 2 && cross >= level) add('IP', 'Cross From', 'Byline', 'Quick enough to get to the byline before crossing.');
      else if (cross != null && quick != null && cross >= level + 2.5 && quick <= level) add('IP', 'Cross From', 'Deep', `Good delivery (Crossing ${cross}) but not quick: cross early from deep.`);
    }

    // Forward runs for central midfielders
    if (['DM', 'M (C)'].includes(ipPos)) {
      const otb = val(p, 'Off the Ball');
      if (otb != null && otb >= level + 3 && (val(p, 'Stamina') ?? 0) >= level && !role.tagSet.has('holder')) add('IP', 'Forward Runs', 'More Often', `Off the Ball ${otb}: arrives in the box well.`);
    }

    // Out of possession
    const pressing = avg(p, ['Work Rate', 'Stamina', 'Aggression']);
    if (pressing != null && pressing >= level + 2.5 && instructions.values.lineOfEngagement !== 'Low Block' && !lane.oopRole.tagSet.has('outlet')) {
      add('OOP', 'Trigger Press', 'More Often', `Work Rate ${val(p, 'Work Rate')}, Stamina ${val(p, 'Stamina')}, Aggression ${val(p, 'Aggression')}: a natural presser.`);
    } else if (pressing != null && (val(p, 'Stamina') ?? 20) <= level - 3 && instructions.values.lineOfEngagement === 'High Press') {
      add('OOP', 'Trigger Press', 'Less Often', `Stamina ${val(p, 'Stamina')}: save his legs.`);
    }
    const tck = val(p, 'Tackling');
    const agg = val(p, 'Aggression');
    if (tck != null && agg != null && tck >= level + 2.5 && agg >= level + 1 && (val(p, 'Bravery') ?? 0) >= level && instructions.values.tackling !== 'Get Stuck In') {
      add('OOP', 'Tackling', 'Get Stuck In', `Tackling ${tck}, Aggression ${agg}.`);
    } else if (tck != null && tck <= level - 2.5 && (agg >= level + 1 || hasTrait(p, /dives into tackles/i)) && /^(D|WB|DM|M) /.test(ctx.slots[lane.oop][2] + ' ')) {
      add('OOP', 'Tackling', 'Stay On Feet', `Tackling ${tck} with Aggression ${agg ?? '–'}: likely to give away fouls.`);
    }
    const mark = avg(p, ['Marking', 'Strength']);
    if (mark != null && mark >= level + S * 2.5 && ['D (C)', 'DM'].includes(ctx.slots[lane.oop][2])) add('OOP', 'Marking', 'Mark Tighter', `Marking ${val(p, 'Marking')}, Strength ${val(p, 'Strength')}.`);

    // Traits that clash with the role
    if (hasTrait(p, /gets forward whenever possible/i) && lane.ipRole.tagSet.has('safeBack')) {
      add('IP', 'Forward Runs', 'Less Often', 'His trait "Gets Forward Whenever Possible" works against his more defensive role.');
    }
    if (hasTrait(p, /stays back at all times/i) && lane.ipRole.tagSet.has('attackingBack')) {
      items.push({ phase: 'IP', name: 'Note', value: 'Trait clash', reason: 'His trait "Stays Back At All Times" fights his attacking role; consider a safer role for him.' });
    }
    out.push({ lane, player: p, items: items.slice(0, 4) });
  }
  return out;
}
