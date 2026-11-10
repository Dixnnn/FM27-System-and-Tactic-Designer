// "Choose players" panel: mark players who must start, a marquee player to build around, and future stars.
// Pure DOM; player names are escaped. Picks are keyed by playerKey (Unique ID, or the name).

import { esc, fitChip } from '../report/util.js';
import { playerKey } from '../engine/picks.js';

const LINES = [
  ['Goalkeepers', (p) => p.isGoalkeeper],
  ['Defenders', (p) => /^(D|WB) /.test(firstPos(p))],
  ['Midfielders', (p) => /^(DM|M )/.test(firstPos(p))],
  ['Attackers', () => true],
];

function firstPos(p) {
  return [...p.bestPos][0] || [...p.positions][0] || '';
}

function bestRole(result, p) {
  const scores = result.suitability.find((s) => s.player === p)?.scores || {};
  let best = null;
  for (const r of result.ctx.roles.roles) {
    if (r.phase !== 'IP' || !scores[r.id]) continue;
    if (!best || scores[r.id].score > best.score) best = { role: r, score: scores[r.id].score };
  }
  return best;
}

/**
 * @param {HTMLElement} el  container
 * @param {object} result  analyse() result (players, suitability, ctx)
 * @param {object} initial  picks for this club {key: {start, label}}
 * @param {{onApply: (picks:object) => void, onClose: () => void}} handlers
 */
export function renderPicker(el, result, initial, { onApply, onClose }) {
  const picks = JSON.parse(JSON.stringify(initial || {}));
  const players = result.players.filter((p) => !p.onLoan);
  const loaned = result.players.filter((p) => p.onLoan);
  const used = new Set();
  const groups = LINES.map(([title, test]) => {
    const ps = players.filter((p) => !used.has(p) && test(p));
    ps.forEach((p) => used.add(p));
    return [title, ps.map((p) => ({ p, best: bestRole(result, p) })).sort((a, b) => (b.best?.score ?? 0) - (a.best?.score ?? 0))];
  });

  const row = ({ p, best }) => {
    const key = playerKey(p);
    const pick = picks[key] || {};
    const label = pick.label || '';
    const id = `pk-${encodeURIComponent(key).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const opt = (value, text) =>
      `<label><input type="radio" name="${id}-label" value="${value}"${label === value ? ' checked' : ''}><span>${text}</span></label>`;
    return `<div class="pk-row" data-key="${esc(key)}" data-gk="${p.isGoalkeeper ? 1 : 0}" data-name="${esc(p.name.toLowerCase())}">
  <div class="pk-name"><strong>${esc(p.name)}</strong><span class="pk-sub">${esc(p.positionsText || [...p.positions].join(', '))}${p.age != null ? ` · ${p.age}` : ''}${p.injured ? ' · <span class="pk-inj">injured</span>' : ''}</span></div>
  <div class="pk-role">${best ? `${fitChip(best.score)}<span class="pk-rn">${esc(best.role.name)}</span>` : ''}</div>
  <label class="switch"><input type="checkbox" class="pk-start"${pick.start || label === 'marquee' ? ' checked' : ''}${label === 'marquee' ? ' disabled' : ''}><span class="knob" aria-hidden="true"></span><span class="sw-text">Must start</span></label>
  <div class="seg mini" role="radiogroup" aria-label="Label for ${esc(p.name)}">${opt('', 'None')}${opt('future', 'Future star')}${opt('marquee', 'Marquee')}</div>
</div>`;
  };

  el.innerHTML = `
<div class="pk-head">
  <div>
    <h2>Build around your players</h2>
    <p class="hint"><strong>Must start</strong>: always in the XI. <strong>Marquee</strong>: the tactic is built around him (always starts, and his fit
    counts 2.5 times when choosing the shape and roles). <strong>Future star</strong>: high potential; wins close calls for a place and gets a development plan.</p>
  </div>
  <div class="pk-actions">
    <span class="pk-count" id="pk-count"></span>
    <button class="btn ghost small" type="button" id="pk-clear">Clear all</button>
    <button class="btn ghost small" type="button" id="pk-close">Close</button>
    <button class="btn" type="button" id="pk-apply">Rebuild tactic</button>
  </div>
</div>
<div class="pk-tools"><input type="search" id="pk-search" placeholder="Find a player…" aria-label="Find a player"></div>
<div id="pk-msg" class="pk-msg" role="status" aria-live="polite"></div>
<div class="pk-list">
  ${groups.filter(([, rows]) => rows.length).map(([title, rows]) => `<div class="pk-group"><div class="pk-gt">${title}</div>${rows.map(row).join('')}</div>`).join('')}
</div>
${loaned.length ? `<p class="hint">Out on loan, so they can't be picked: ${loaned.map((p) => esc(p.name)).join(', ')}.</p>` : ''}`;

  const $ = (sel) => el.querySelector(sel);
  const msg = (html) => {
    $('#pk-msg').innerHTML = html;
  };
  const state = () => {
    const out = {};
    for (const r of el.querySelectorAll('.pk-row')) {
      const label = r.querySelector('input[type="radio"]:checked')?.value || '';
      const start = r.querySelector('.pk-start').checked;
      if (start || label) out[r.dataset.key] = { start: start || label === 'marquee', label: label || null };
    }
    return out;
  };
  const validate = () => {
    const rows = [...el.querySelectorAll('.pk-row')];
    const locked = rows.filter((r) => r.querySelector('.pk-start').checked);
    const gks = locked.filter((r) => r.dataset.gk === '1');
    const futures = rows.filter((r) => r.querySelector('input[value="future"]:checked')).length;
    const marquees = rows.filter((r) => r.querySelector('input[value="marquee"]:checked')).length;
    $('#pk-count').textContent = `${locked.length} / 11 must start · ${marquees} marquee · ${futures} future star${futures === 1 ? '' : 's'}`;
    let problem = '';
    if (locked.length > 11) problem = 'Only 11 players can start: unmark some.';
    else if (gks.length > 1) problem = 'Only one goalkeeper can start.';
    else if (marquees > 3) problem = 'Building around more than three marquee players rarely works; the tool will try, but consider fewer.';
    msg(problem ? `<span class="pk-warn">${esc(problem)}</span>` : '');
    $('#pk-apply').disabled = locked.length > 11 || gks.length > 1;
  };

  el.addEventListener('change', (e) => {
    const r = e.target.closest('.pk-row');
    if (r && e.target.type === 'radio') {
      const start = r.querySelector('.pk-start');
      if (e.target.value === 'marquee') {
        start.checked = true;
        start.disabled = true;
      } else {
        start.disabled = false;
      }
    }
    validate();
  });
  $('#pk-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    for (const r of el.querySelectorAll('.pk-row')) r.hidden = !!q && !r.dataset.name.includes(q);
  });
  $('#pk-clear').addEventListener('click', () => {
    for (const r of el.querySelectorAll('.pk-row')) {
      const start = r.querySelector('.pk-start');
      start.checked = false;
      start.disabled = false;
      r.querySelector('input[value=""]').checked = true;
    }
    validate();
  });
  $('#pk-close').addEventListener('click', onClose);
  $('#pk-apply').addEventListener('click', () => onApply(state()));
  validate();
  return { showError: (text) => msg(`<span class="pk-warn">${esc(text)}</span>`) };
}

/** Number of players picked in some way (for the toolbar button). */
export const pickCount = (picks) => Object.values(picks || {}).filter((p) => p.start || p.label).length;
