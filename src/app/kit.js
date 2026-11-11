// Club colours picker in the report header: ready-made kits plus your own shirt and trim colours.
// Remembered per club in this browser; changing it recolours the tokens straight away (no rebuild).

import { esc } from '../report/util.js';
import { KIT_PRESETS, cleanKit, kitStyle } from '../report/kit.js';

let outside = null; // closes the menu on a click elsewhere; replaced when the report is rebuilt

const swatch = (shirt, trim) => `<span class="kit-sw" style="--a:${shirt};--b:${trim}"></span>`;

/**
 * @param {HTMLElement} slot  #kit-slot in the report header
 * @param {{shirt:string, trim:string}|null} kit  the saved kit
 * @param {(kit: {shirt:string, trim:string}|null) => void} onChange
 */
export function renderKitPicker(slot, kit, onChange) {
  const k = cleanKit(kit);
  slot.innerHTML = `<details class="kit-menu" id="kit-menu">
  <summary title="Choose your club colours for the player tokens">${k ? swatch(k.shirt, k.trim) : swatch('var(--token)', 'var(--line-2)')}<span class="kit-l">Club colours</span></summary>
  <div class="kit-pop">
    <div class="kit-h">Club colours</div>
    <p class="kit-p">The players on the pitches wear your kit. The fit rings keep their colours.</p>
    <div class="kit-presets">${KIT_PRESETS.map(([name, shirt, trim]) =>
      `<button type="button" data-shirt="${shirt}" data-trim="${trim}" title="${esc(name)}" aria-label="${esc(name)}" aria-pressed="${!!k && k.shirt === shirt && k.trim === trim}">${swatch(shirt, trim)}</button>`).join('')}</div>
    <div class="kit-custom"><label>Shirt <input type="color" id="kit-shirt" value="${k?.shirt || '#c8102e'}"></label><label>Trim <input type="color" id="kit-trim" value="${k?.trim || '#ffffff'}"></label></div>
    <button type="button" class="linkbtn" id="kit-reset">Plain tokens (no kit)</button>
  </div>
</details>`;
  const menu = slot.querySelector('#kit-menu');
  const set = (next) => {
    const clean = cleanKit(next);
    onChange(clean);
    const sum = menu.querySelector('summary .kit-sw');
    sum.style.setProperty('--a', clean ? clean.shirt : 'var(--token)');
    sum.style.setProperty('--b', clean ? clean.trim : 'var(--line-2)');
    for (const b of menu.querySelectorAll('.kit-presets button')) {
      b.setAttribute('aria-pressed', String(!!clean && b.dataset.shirt === clean.shirt && b.dataset.trim === clean.trim));
    }
    if (clean) {
      menu.querySelector('#kit-shirt').value = clean.shirt;
      menu.querySelector('#kit-trim').value = clean.trim;
    }
  };
  menu.querySelector('.kit-presets').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) set({ shirt: b.dataset.shirt, trim: b.dataset.trim });
  });
  const custom = () => set({ shirt: menu.querySelector('#kit-shirt').value, trim: menu.querySelector('#kit-trim').value });
  menu.querySelector('#kit-shirt').addEventListener('input', custom);
  menu.querySelector('#kit-trim').addEventListener('input', custom);
  menu.querySelector('#kit-reset').addEventListener('click', () => set(null));
  outside?.abort();
  outside = new AbortController();
  document.addEventListener('click', (e) => {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  }, { signal: outside.signal });
}

/** Apply a kit to the report element. */
export function applyKit(article, kit) {
  if (!article) return;
  for (const v of ['--kit-1', '--kit-2', '--kit-ink', '--kit-ring']) article.style.removeProperty(v);
  for (const part of kitStyle(kit).split(';').filter(Boolean)) {
    const [name, value] = part.split(':');
    article.style.setProperty(name, value);
  }
}
