// "Your idea" panel: describe the tactic you want in your own words, see what the builder understood while you
// type, choose how hard it should push (Normal to Extreme), and rebuild.

import { esc } from '../report/util.js';
import { interpretIdea, INTENSITY } from '../engine/idea.js';
import { generalLevel } from '../engine/profile.js';

const last = (p) => p.name.split(/\s+/).pop();

/** Example ideas that use your own players' names. */
function examples(result) {
  const lanes = result.best.lanes;
  const pos = (re) => lanes.filter((l) => re.test(result.ctx.slots[l.ip][2])).map((l) => l.player);
  const striker = pos(/^ST/)[0] || lanes[lanes.length - 1].player;
  const mid = pos(/^(DM|M \(C\)|AM \(C\))/)[0];
  const wide = pos(/^(M|AM) \((L|R)\)/)[0];
  return [
    `I want ${last(striker)} to score as many headers as possible`,
    mid && `Play everything through ${last(mid)}`,
    'Press high and win the ball back fast',
    'Park the bus and hit them on the counter',
    wide && `Let ${last(wide)} take defenders on`,
    'Keep the ball and wear them down',
    'Wing play with lots of crosses',
    'Give my young players minutes',
  ].filter(Boolean);
}

/**
 * @param {HTMLElement} el
 * @param {object} result  analyse() result
 * @param {{text?: string, intensity?: number}} current  saved idea for this club
 * @param {{onApply: (idea:{text:string, intensity:number}) => void, onClose: () => void}} handlers
 */
export function renderIdeaPanel(el, result, current, { onApply, onClose }) {
  const levels = result.players.filter((p) => !p.onLoan && !p.isGoalkeeper).map(generalLevel).filter((v) => v != null).sort((a, b) => b - a).slice(0, 18);
  const level = levels.length ? levels.reduce((s, v) => s + v, 0) / levels.length : 11;
  el.innerHTML = `
<div class="pk-head">
  <div>
    <h2>Your idea</h2>
    <p class="hint">Describe the tactic you want, in your own words, and the builder makes it as workable as it can. It understands football
    phrases and your players' names (it works offline, without AI), and shows what it understood below before you build.</p>
  </div>
  <div class="pk-actions">
    <button class="btn ghost small" type="button" id="id-clear">Clear idea</button>
    <button class="btn ghost small" type="button" id="id-close">Close</button>
    <button class="btn" type="button" id="id-apply">Build my idea</button>
  </div>
</div>
<textarea id="id-text" rows="2" placeholder="e.g. I want ${esc(last(result.best.lanes[result.best.lanes.length - 1].player))} to score as many headers as possible" aria-label="Your idea">${esc(current?.text || '')}</textarea>
<div class="id-ex">${examples(result).map((x) => `<button type="button" class="id-chip">${esc(x)}</button>`).join('')}</div>
<div class="id-slider">
  <label for="id-k">How hard to push it</label>
  <input type="range" id="id-k" min="0" max="3" step="1" value="${Math.max(0, Math.min(3, current?.intensity ?? 1))}">
  <div class="id-ticks">${INTENSITY.map((t, i) => `<span data-i="${i}">${t}</span>`).join('')}</div>
  <p class="hint" id="id-khint"></p>
</div>
<div class="id-understood" id="id-understood" role="status" aria-live="polite"></div>
<div id="id-msg" class="pk-msg" role="status" aria-live="polite"></div>`;
  const $ = (sel) => el.querySelector(sel);
  const HINTS = [
    'Normal: the idea shapes the instructions and nudges roles, but the strongest team still comes first.',
    'Strong: roles and instructions follow the idea, even if a player is slightly less suited.',
    'Very strong: the idea leads; the shape and roles bend towards it.',
    'Extreme: everything serves the idea, even at a clear cost in team fit. A fun baseline to experiment with.',
  ];
  const refresh = () => {
    const k = Number($('#id-k').value);
    for (const s of el.querySelectorAll('.id-ticks span')) s.classList.toggle('on', Number(s.dataset.i) === k);
    $('#id-khint').textContent = HINTS[k];
    const text = $('#id-text').value;
    if (!text.trim()) {
      $('#id-understood').innerHTML = '<span class="muted">Type an idea, or click an example.</span>';
      return;
    }
    const plan = interpretIdea(text, result.players, k, { level });
    if (plan.empty) {
      $('#id-understood').innerHTML = `<span class="pk-warn">Nothing recognised yet. Try football words like headers, press, counter, wing play, keep the ball, playmaker, long shots, young players, or a player's name.</span>`;
      return;
    }
    const items = plan.understood
      .map((u) => `<span class="id-u"><b>${esc(u.label)}</b>${u.player ? ` · ${esc(u.player.name)}${u.auto ? ` <i>(${esc(u.autoWhy)})</i>` : ''}` : ''}</span>`)
      .join('');
    const extra = [
      ...plan.ignored.map((x) => `Ignored ${esc(x)}: say what you want instead (e.g. "defend deep" rather than "don't press").`),
      ...plan.ambiguous.map((p) => `Several players share the name "${esc(last(p))}": using ${esc(p.name)}. Write the full name to choose another.`),
      ...plan.notes.map(esc),
    ];
    $('#id-understood').innerHTML = `<div class="id-ul">Understood as:</div><div class="id-us">${items}</div>${extra.length ? `<ul class="id-notes">${extra.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}`;
  };
  $('#id-text').addEventListener('input', refresh);
  $('#id-k').addEventListener('input', refresh);
  el.querySelector('.id-ex').addEventListener('click', (e) => {
    const b = e.target.closest('.id-chip');
    if (!b) return;
    $('#id-text').value = b.textContent;
    refresh();
  });
  $('#id-clear').addEventListener('click', () => onApply({ text: '', intensity: Number($('#id-k').value) }));
  $('#id-close').addEventListener('click', onClose);
  $('#id-apply').addEventListener('click', () => onApply({ text: $('#id-text').value.trim(), intensity: Number($('#id-k').value) }));
  refresh();
  return { showError: (text) => ($('#id-msg').innerHTML = `<span class="pk-warn">${esc(text)}</span>`) };
}
