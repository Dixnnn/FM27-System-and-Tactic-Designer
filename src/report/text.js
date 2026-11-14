// The tactic as plain text, to paste into a forum post, a Discord message or your own notes.
// Same content as the cheat sheet: only settings that differ from FM's defaults.

/**
 * @param {object} result  analyse() result
 * @returns {string}
 */
export function tacticText(result) {
  const { best, instructions: ins, ctx, setPieces: sp, captain, playerInstructions: pis } = result;
  const slots = ctx.slots;
  const name = (t) => t?.name || '–';
  const lines = [];
  lines.push(`${result.club ? `${result.club}: ` : ''}FM27 tactic`);
  lines.push(`Style to start from: ${ins.style.value || 'any (custom)'} · Mentality: ${ins.mentality.value}`);
  lines.push(`In possession: ${best.ipName} · Out of possession: ${best.oopName} · Team fit ${best.fit.toFixed(1)}/100`);
  lines.push('');
  lines.push('PLAYERS (in possession spot and role / out of possession spot and role)');
  for (const l of best.lanes.slice().sort((a, b) => slots[a.ip][1] - slots[b.ip][1] || slots[a.ip][0] - slots[b.ip][0])) {
    lines.push(`- ${l.player.name}: ${slots[l.ip][3]} ${l.ipRole.name} / ${slots[l.oop][3]} ${l.oopRole.name}`);
  }
  const changed = (list) => list.filter((i) => i.changed).map((i) => `- ${i.name}: ${i.value}`);
  const ip = changed(ins.ip);
  const oop = changed(ins.oop);
  lines.push('');
  lines.push('IN POSSESSION (changed from default)');
  lines.push(...(ip.length ? ip : ['- nothing, all defaults']));
  lines.push('');
  lines.push('OUT OF POSSESSION (changed from default)');
  lines.push(...(oop.length ? oop : ['- nothing, all defaults']));
  const withPi = pis.filter((x) => x.items.length);
  if (withPi.length) {
    lines.push('');
    lines.push('PLAYER INSTRUCTIONS');
    for (const x of withPi) lines.push(`- ${x.player.name}: ${x.items.map((i) => `${i.name}: ${i.value}`).join('; ')}`);
  }
  lines.push('');
  lines.push('SET PIECES');
  lines.push(`- Captain / vice: ${name(captain.captain)} / ${name(captain.vice)}`);
  lines.push(`- Corners left / right: ${name(sp.cornersLeft)} / ${name(sp.cornersRight)}`);
  lines.push(`- Free kicks (shots / crosses): ${name(sp.directFreeKicks)} / ${name(sp.indirectFreeKicks)}`);
  lines.push(`- Penalties: ${sp.penalties.filter(Boolean).map(name).join(', ')}`);
  if (sp.longThrows) lines.push(`- Long throws: ${name(sp.longThrows)}`);
  lines.push('');
  lines.push('Made with FM27 Tactic Builder');
  return lines.join('\n');
}
