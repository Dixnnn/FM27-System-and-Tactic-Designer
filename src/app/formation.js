// "Formation" panel: choose the in-possession and/or out-of-possession shape yourself, or let the tool choose.
// The tactic (players, roles, instructions) is then built on that shape.

import { esc, fmt } from '../report/util.js';

/**
 * @param {HTMLElement} el  container
 * @param {object} result  analyse() result
 * @param {{inPossession: object[], outOfPossession: object[]}} formations  data/formations.json
 * @param {{ip?: string|null, oop?: string|null}} current  saved choice for this club
 * @param {{onApply: (choice:{ip:string|null, oop:string|null}) => void, onClose: () => void}} handlers
 */
export function renderFormationPanel(el, result, formations, current, { onApply, onClose }) {
  const options = (list, chosen) =>
    `<option value="">Let the tool choose</option>${list.map((f) => `<option value="${esc(f.name)}"${f.name === chosen ? ' selected' : ''}>${esc(f.name)}</option>`).join('')}`;
  const ranking = (result.formationChoice ? [result.formationChoice.auto, result.best] : result.search.ranking).filter(Boolean);
  const seen = new Set();
  const top = ranking
    .filter((s) => !seen.has(s.ipName + '|' + s.oopName) && seen.add(s.ipName + '|' + s.oopName))
    .slice(0, 5)
    .map((s) => `<button type="button" data-ip="${esc(s.ipName)}" data-oop="${esc(s.oopName)}"><b>${esc(s.ipName)}</b> / ${esc(s.oopName)} <span class="muted">${fmt(s.fit, 1)}</span></button>`)
    .join('');
  el.innerHTML = `
<div class="pk-head">
  <div>
    <h2>Formation</h2>
    <p class="hint">Pick the shape yourself and the tool builds the best eleven, roles and instructions for it. Leave a phase on
    <strong>Let the tool choose</strong> to have it pick the best partner shape. Remembered for this club.</p>
  </div>
  <div class="pk-actions">
    <button class="btn ghost small" type="button" id="fm-auto">Let the tool choose both</button>
    <button class="btn ghost small" type="button" id="fm-close">Close</button>
    <button class="btn" type="button" id="fm-apply">Rebuild tactic</button>
  </div>
</div>
<div class="fm-grid">
  <label>In possession<select id="fm-ip">${options(formations.inPossession, current?.ip)}</select></label>
  <label>Out of possession<select id="fm-oop">${options(formations.outOfPossession, current?.oop)}</select></label>
</div>
<div class="hint">Strong systems for this squad (team fit), to start from:</div>
<div class="fm-top">${top}</div>
<div id="fm-msg" class="pk-msg" role="status" aria-live="polite"></div>`;
  const $ = (sel) => el.querySelector(sel);
  const choice = () => ({ ip: $('#fm-ip').value || null, oop: $('#fm-oop').value || null });
  el.querySelector('.fm-top').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $('#fm-ip').value = b.dataset.ip;
    $('#fm-oop').value = b.dataset.oop;
  });
  $('#fm-auto').addEventListener('click', () => onApply({ ip: null, oop: null }));
  $('#fm-close').addEventListener('click', onClose);
  $('#fm-apply').addEventListener('click', () => onApply(choice()));
  return { showError: (text) => ($('#fm-msg').innerHTML = `<span class="pk-warn">${esc(text)}</span>`) };
}
