// One-page cheat sheet: everything to enter in FM27 on a single A4 page, to keep next to you.
// Only settings that differ from FM's defaults are listed; everything else stays as it is.

import { pitchSVG } from './pitch.js';
import { esc, shortName } from './util.js';
import { crestSVG } from './crest.js';

/**
 * @param {object} result  analyse() result
 * @returns {string} HTML for the printed sheet
 */
export function cheatSheet(result) {
  const { best, instructions: ins, ctx, setPieces: sp, captain, playerInstructions: pis } = result;
  const slots = ctx.slots;
  const items = (phase) =>
    best.lanes.map((l) => ({
      slot: phase === 'IP' ? l.ip : l.oop,
      abbr: (phase === 'IP' ? l.ipRole : l.oopRole).abbr,
      roleName: (phase === 'IP' ? l.ipRole : l.oopRole).name,
      name: l.player.name,
      score: (phase === 'IP' ? l.ipScore : l.oopScore).score,
      captain: l.player === captain.captain?.player,
    }));
  const changed = (list) => list.filter((i) => i.changed);
  const rows = (list) => list.map((i) => `<tr><td>${esc(i.name)}</td><td><b>${esc(i.value)}</b></td></tr>`).join('');
  const ip = changed(ins.ip);
  const oop = changed(ins.oop);
  const roles = best.lanes
    .slice()
    .sort((a, b) => slots[a.ip][1] - slots[b.ip][1] || slots[a.ip][0] - slots[b.ip][0])
    .map((l) => `<tr><td>${esc(shortName(l.player.name))}</td><td>${esc(slots[l.ip][3])} · ${esc(l.ipRole.abbr)}</td><td>${esc(slots[l.oop][3])} · ${esc(l.oopRole.abbr)}</td></tr>`)
    .join('');
  const piRows = pis
    .filter((x) => x.items.length)
    .map((x) => `<tr><td>${esc(shortName(x.player.name))}</td><td>${x.items.map((i) => `${esc(i.name)}: <b>${esc(i.value)}</b>`).join('; ')}</td></tr>`)
    .join('');
  const name = (t) => (t ? esc(shortName(t.name)) : '–');
  return `<div class="sheet">
  <header><div class="sh-brand">${crestSVG({ cls: 'sh-crest' })}<div><div class="eyebrow">FM27 Tactic Builder · cheat sheet</div><h1>${esc(result.club || 'Your tactic')}</h1></div></div>
  <div class="sh-kpis"><span>Style <b>${esc(ins.style.value || 'Any')}</b></span><span>Mentality <b>${esc(ins.mentality.value)}</b></span>
  <span>In possession <b>${esc(best.ipName)}</b></span><span>Out of possession <b>${esc(best.oopName)}</b></span></div></header>
  <div class="sh-grid">
    <div class="sh-pitches">
      <figure><figcaption>In possession</figcaption>${pitchSVG(items('IP'), slots, 'In possession shape')}</figure>
      <figure><figcaption>Out of possession</figcaption>${pitchSVG(items('OOP'), slots, 'Out of possession shape')}</figure>
      <table class="sh-t"><thead><tr><th>Player</th><th>IP spot · role</th><th>OOP spot · role</th></tr></thead><tbody>${roles}</tbody></table>
    </div>
    <div class="sh-cols">
      <h2>In possession <span>(only changes from default)</span></h2>
      <table class="sh-t">${rows(ip) || '<tr><td>All defaults</td></tr>'}</table>
      <h2>Out of possession</h2>
      <table class="sh-t">${rows(oop) || '<tr><td>All defaults</td></tr>'}</table>
      ${piRows ? `<h2>Player instructions</h2><table class="sh-t">${piRows}</table>` : ''}
      <h2>Set pieces</h2>
      <table class="sh-t">
        <tr><td>Captain / vice</td><td><b>${name(captain.captain)}</b> / ${name(captain.vice)}</td></tr>
        <tr><td>Corners left / right</td><td><b>${name(sp.cornersLeft)}</b> / <b>${name(sp.cornersRight)}</b></td></tr>
        <tr><td>Free kicks shot / cross</td><td><b>${name(sp.directFreeKicks)}</b> / <b>${name(sp.indirectFreeKicks)}</b></td></tr>
        <tr><td>Penalties</td><td>${sp.penalties.slice(0, 3).map((p) => name(p)).join(', ')}</td></tr>
        ${sp.longThrows ? `<tr><td>Long throws</td><td><b>${name(sp.longThrows)}</b></td></tr>` : ''}
        <tr><td>Attack the ball</td><td>${sp.aerialTargets.slice(0, 3).map((t) => name(t)).join(', ')}</td></tr>
        <tr><td>Stay back</td><td>${sp.stayBack.map((t) => name(t)).join(', ')}</td></tr>
      </table>
    </div>
  </div>
  <p class="sh-foot">Everything not listed stays at FM's default. Made with FM27 Tactic Builder. It can't enter the tactic into the game for you.</p>
</div>`;
}
