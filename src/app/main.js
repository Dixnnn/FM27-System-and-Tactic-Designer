// Browser app: file in -> report out. Everything happens inside the page; nothing is sent anywhere.

import { analyse } from '../analyse.js';
import { DEFAULT_DOCS } from '../data.js';
import { renderReport, standaloneReport, SECTIONS, matchPlanBody } from '../report/render.js';
import { esc, ICON } from '../report/util.js';
import { renderPicker, pickCount } from './picker.js';
import { renderFormationPanel } from './formation.js';
import { renderIdeaPanel } from './idea.js';
import { saveTacticImage } from './share.js';
import { playerCard } from '../report/card.js';
import { cheatSheet } from '../report/sheet.js';
import { renderKitPicker, applyKit } from './kit.js';
import sampleCsv from '../../samples/squad_20261108_201500.csv';

const STORE_KEY = 'fm27-tactic-builder.custom-docs';
const THEME_KEY = 'fm27-tactic-builder.theme';
const STRENGTH_KEY = 'fm27-tactic-builder.strength';
const PICKS_KEY = 'fm27-tactic-builder.picks';
const FORMATION_KEY = 'fm27-tactic-builder.formation';
const CHECK_KEY = 'fm27-tactic-builder.checklist';
const MATCH_KEY = 'fm27-tactic-builder.match';
const IDEA_KEY = 'fm27-tactic-builder.idea';
const KIT_KEY = 'fm27-tactic-builder.kit';
const $ = (id) => document.getElementById(id);

let lastResult = null;
let lastSignature = '';
let lastInput = null;
let walkTimer = 0;

// Picks are saved per club, so a new export of the same squad keeps them.
const clubKey = (club) => club || '(no club)';
function loadPicks() {
  try {
    return JSON.parse(localStorage.getItem(PICKS_KEY) || '{}');
  } catch {
    return {};
  }
}
function savePicks(club, picks) {
  const all = loadPicks();
  if (pickCount(picks)) all[clubKey(club)] = picks;
  else delete all[clubKey(club)];
  remember(PICKS_KEY, JSON.stringify(all));
}

// Your own formation, also per club: {ip, oop} (null = the tool chooses).
function loadFormations() {
  try {
    return JSON.parse(localStorage.getItem(FORMATION_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveFormation(club, choice) {
  const all = loadFormations();
  if (choice.ip || choice.oop) all[clubKey(club)] = choice;
  else delete all[clubKey(club)];
  remember(FORMATION_KEY, JSON.stringify(all));
}

function store(read, value) {
  try {
    if (read) return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    localStorage.setItem(STORE_KEY, JSON.stringify(value));
  } catch {
    return read ? {} : undefined;
  }
  return undefined;
}

function currentDocs() {
  const custom = store(true) || {};
  return {
    ...DEFAULT_DOCS,
    roles: custom.roles || DEFAULT_DOCS.roles,
    tuning: custom.tuning ? { ...DEFAULT_DOCS.tuning, ...custom.tuning } : DEFAULT_DOCS.tuning,
  };
}

function setStatus(html, isError = false) {
  $('status').innerHTML = isError ? `<div class="error">${ICON.warn}<div>${html}</div></div>` : html;
}

function remember(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private window): just don't remember */
  }
}

function recall(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const currentTheme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
const strengthValue = () => Number(document.querySelector('input[name="strength"]:checked')?.value ?? 0);

/** Decode a file, coping with UTF-16 and old Windows encodings. */
function decode(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(buffer);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(buffer);
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  const bad = (utf8.match(/�/g) || []).length;
  return bad > 3 ? new TextDecoder('windows-1252').decode(buffer) : utf8;
}

function showError(result) {
  const c = result.columns;
  let extra = lastInput?.fromGame
    ? '<p>In FM27, switch your Squad view to <strong>FM27TFT</strong>, the plugin’s built-in view (or add the columns below) and press <strong>F8</strong> again.</p>'
    : '';
  if (c && (c.missingEssential.length || c.fatal)) {
    const list = c.missingEssential.slice(0, 20).map((m) => `<li><strong>${esc(m.label)}</strong>${m.menu ? ` – Insert Column › ${esc(m.menu)}` : ''}</li>`).join('');
    if (list) extra += `<p>Columns to add to your squad view in FM27:</p><ul>${list}</ul>`;
  }
  setStatus(`<strong>That file couldn't be used.</strong> ${esc(result.error)}${extra}`, true);
}

function analyseNow(text, filename, picks, formation, idea) {
  const saved = loadPicks();
  const savedFormation = loadFormations();
  const savedIdeas = loadIdeas();
  return analyse(text, filename, currentDocs(), {
    excludeInjured: $('opt-injured').checked,
    strength: strengthValue(),
    picks: picks ?? ((club) => saved[clubKey(club)] || {}),
    formation: formation ?? ((club) => savedFormation[clubKey(club)] || {}),
    idea: idea ?? ((club) => savedIdeas[clubKey(club)] || null),
    exportedAt: lastInput?.exportedAt || undefined,
    scouting: lastInput?.scouting || undefined,
    history: lastInput?.history?.length ? lastInput.history : undefined,
  });
}

let spy = null;

// ---- checklist mode: ticks are saved per tactic, so a new or changed tactic starts with a clean list
function tacticSignature(r) {
  const parts = [r.club, r.best.ipName, r.best.oopName, JSON.stringify(r.instructions.values), r.instructions.mentality.value,
    ...r.best.lanes.map((l) => `${l.player.id}:${l.ip}:${l.ipRole.id}:${l.oop}:${l.oopRole.id}`)];
  let h = 5381;
  for (const ch of parts.join('|')) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}
function loadChecks() {
  try {
    return JSON.parse(localStorage.getItem(CHECK_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveChecks(sig, keys) {
  const all = loadChecks();
  if (keys.length) all[sig] = keys;
  else delete all[sig];
  const sigs = Object.keys(all);
  if (sigs.length > 20) for (const old of sigs.slice(0, sigs.length - 20)) delete all[old]; // keep the last 20 tactics
  remember(CHECK_KEY, JSON.stringify(all));
}
function updateChecklist() {
  const boxes = [...$('setup')?.querySelectorAll('.tick input') || []];
  const done = boxes.filter((b) => b.checked).length;
  for (const b of boxes) b.closest('tr')?.classList.toggle('done', b.checked);
  if (!$('cb-done')) return;
  $('cb-done').textContent = String(done);
  $('cb-total').textContent = String(boxes.length);
  $('cb-fill').style.width = `${boxes.length ? (done / boxes.length) * 100 : 0}%`;
  const complete = boxes.length > 0 && done === boxes.length;
  $('checkbar').classList.toggle('complete', complete);
  $('cb-lock').textContent = complete ? ' · tactic locked in' : '';
  $('setup').classList.toggle('locked', complete);
}
function setupChecklist(result) {
  const sig = tacticSignature(result);
  const saved = new Set(loadChecks()[sig] || []);
  for (const b of $('setup')?.querySelectorAll('.tick input') || []) b.checked = saved.has(b.dataset.k);
  updateChecklist();
  return sig;
}

// ---- your idea, remembered per club ({text, intensity})
function loadIdeas() {
  try {
    return JSON.parse(localStorage.getItem(IDEA_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveIdea(club, idea) {
  const all = loadIdeas();
  if (idea.text) all[clubKey(club)] = idea;
  else delete all[clubKey(club)];
  remember(IDEA_KEY, JSON.stringify(all));
}

// ---- club colours, remembered per club
function loadKit(club) {
  try {
    return JSON.parse(localStorage.getItem(KIT_KEY) || '{}')[clubKey(club)] || null;
  } catch {
    return null;
  }
}
function saveKit(club, kit) {
  let all = {};
  try {
    all = JSON.parse(localStorage.getItem(KIT_KEY) || '{}');
  } catch {
    /* start again */
  }
  if (kit) all[clubKey(club)] = kit;
  else delete all[clubKey(club)];
  remember(KIT_KEY, JSON.stringify(all));
}

// ---- match plan: the next opponent, remembered per club
function loadMatch(club) {
  try {
    return JSON.parse(localStorage.getItem(MATCH_KEY) || '{}')[clubKey(club)] || {};
  } catch {
    return {};
  }
}
function saveMatch(club, opp) {
  let all = {};
  try {
    all = JSON.parse(localStorage.getItem(MATCH_KEY) || '{}');
  } catch {
    /* start again */
  }
  all[clubKey(club)] = opp;
  remember(MATCH_KEY, JSON.stringify(all));
}
function readMatchControls() {
  const form = $('mp-controls');
  const one = (n) => form.querySelector(`input[name="mp-${n}"]:checked`)?.value || null;
  const many = (n) => [...form.querySelectorAll(`input[name="mp-${n}"]:checked`)].map((i) => i.value);
  return { strength: one('strength'), venue: one('venue'), style: many('style'), players: many('players') };
}
function updateMatch() {
  if (!lastResult || !$('mp-controls')) return;
  const opp = readMatchControls();
  saveMatch(lastResult.club, opp);
  $('mp-out').innerHTML = matchPlanBody(lastResult, opp);
}

// ---- role suitability filter
function applyFilter() {
  const section = $('suitability');
  if (!section || !$('sf-q')) return;
  const q = $('sf-q').value.trim().toLowerCase();
  const g = $('sf-g').value;
  const xiOnly = $('sf-xi').checked;
  const showLoan = $('sf-loan').checked;
  let shown = 0;
  const rowsOk = (tr) => (!q || tr.dataset.name.includes(q)) && (!xiOnly || tr.dataset.xi === '1') && (showLoan || tr.dataset.loan !== '1');
  for (const tr of section.querySelectorAll('table.best tbody tr')) {
    const ok = rowsOk(tr) && (!g || tr.dataset.groups.split(' ').includes(g));
    tr.toggleAttribute('data-hidden', !ok);
    if (ok) shown++;
  }
  for (const grp of section.querySelectorAll('.mx-group')) {
    let any = false;
    for (const tr of grp.querySelectorAll('tbody tr')) {
      const ok = rowsOk(tr);
      tr.toggleAttribute('data-hidden', !ok);
      any ||= ok;
    }
    grp.toggleAttribute('data-hidden', (g && grp.dataset.group !== g) || !any);
  }
  const total = section.querySelectorAll('table.best tbody tr').length;
  $('sf-count').textContent = !shown ? 'No players match' : shown === total ? `${total} players` : `${shown} of ${total} players`;
}

// ---- player cards
function openCard(pid) {
  const p = lastResult?.players.find((x) => x.id === pid);
  if (!p) return;
  $('pcard-body').innerHTML = playerCard(lastResult, p);
  const dlg = $('pcard');
  if (typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.setAttribute('open', '');
}

/** The section bar under the toolbar: one link per report section, the one you're reading underlined. */
function buildSectionNav() {
  const nav = $('secnav');
  const present = SECTIONS.filter(([id]) => document.getElementById(id));
  nav.innerHTML = present.map(([id, label], i) => `<a href="#${id}" data-id="${id}"><span class="n">${i + 1}</span>${esc(label)}</a>`).join('');
  const setOffset = () => document.documentElement.style.setProperty('--scroll-offset', `${$('result').querySelector('.topbar').offsetHeight + 12}px`);
  setOffset();
  window.addEventListener('resize', setOffset, { passive: true });
  spy?.disconnect();
  if (!('IntersectionObserver' in window)) return;
  const visible = new Map();
  const mark = () => {
    const current = present.map(([id]) => id).find((id) => visible.get(id)) || null;
    for (const a of nav.querySelectorAll('a')) a.classList.toggle('on', a.dataset.id === current);
    const on = nav.querySelector('a.on');
    if (on && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2; // keep it in view on phones
  };
  spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) visible.set(e.target.id, e.isIntersecting);
      mark();
    },
    { rootMargin: '-140px 0px -55% 0px' },
  );
  for (const [id] of present) spy.observe(document.getElementById(id));
}

function showResult(result, note = '') {
  lastResult = result;
  const holder = $('report-holder');
  holder.innerHTML = renderReport(result, { match: loadMatch(result.club), kit: loadKit(result.club) });
  holder.classList.add('in-app');
  renderKitPicker($('kit-slot'), loadKit(result.club), (kit) => {
    saveKit(result.club, kit);
    applyKit(holder.querySelector('.report'), kit);
  });
  // players walk out onto the pitch (CSS animation; switched off for reduced motion)
  clearTimeout(walkTimer);
  holder.classList.remove('walkout');
  void holder.offsetWidth;
  holder.classList.add('walkout');
  walkTimer = setTimeout(() => holder.classList.remove('walkout'), 2600);
  $('sheet-holder').innerHTML = cheatSheet(result);
  buildSectionNav();
  lastSignature = setupChecklist(result);
  applyFilter();
  $('start').classList.add('hidden');
  $('result').classList.remove('hidden');
  $('picker').classList.add('hidden');
  const n = pickCount(loadPicks()[clubKey(result.club)]);
  $('picks-badge').textContent = n ? String(n) : '';
  $('picks-badge').hidden = !n;
  $('formation-badge').hidden = !result.formationChoice;
  $('formation-panel').classList.add('hidden');
  $('idea-badge').hidden = !(result.idea && !result.idea.empty);
  $('idea-panel').classList.add('hidden');
  $('result-note').innerHTML = note ? `<div class="error">${ICON.warn}<div>${note}</div></div>` : '';
  $('src-note').textContent = lastInput?.label || '';
  $('strength-quick').value = String(strengthValue());
  $('strength-quick').disabled = false;
  setStatus('');
  window.scrollTo(0, 0);
}

/**
 * @param {string} text  the export
 * @param {string} filename
 * @param {{label?: string, fromGame?: boolean, exportedAt?: string, scouting?: object, history?: object[], focus?: string}} [from]
 *   where it came from (shown above the report), and extra exports to compare (shortlist, earlier squads)
 */
function run(text, filename, from = {}) {
  lastInput = {
    text, filename, label: from.label ?? filename, fromGame: !!from.fromGame,
    exportedAt: from.exportedAt || null, scouting: from.scouting || null, history: from.history || [],
  };
  const focus = from.focus;
  setStatus('<div class="working"><span>Working out your tactic…</span><span class="track"><i></i></span></div>');
  setTimeout(() => {
    $('strength-quick').disabled = false; // the work below is synchronous, so the page can't be clicked meanwhile
    let result;
    let note = '';
    try {
      result = analyseNow(text, filename);
      if (!result.ok && result.formationError) {
        note = `Your formation was not used: ${esc(result.error)} Open <strong>Formation</strong> to change it.`;
        result = analyseNow(text, filename, undefined, {});
      }
      if (!result.ok && result.pickError) {
        // Saved picks no longer fit (players left, positions changed): build without them and say so.
        note = `Your saved picks were not used: ${esc(result.error)} Open <strong>Choose players</strong> to change them.`;
        result = analyseNow(text, filename, {});
      }
    } catch (err) {
      console.error(err);
      setStatus(`<strong>Something went wrong while reading the file.</strong> ${esc(err.message)}. If this keeps happening, see "Common problems" in the README.`, true);
      return;
    }
    if (!result.ok) {
      showError(result);
      return;
    }
    showResult(result, note);
    if (focus) setTimeout(() => document.getElementById(focus)?.scrollIntoView({ block: 'start' }), 60);
  }, 30);
}

/** A shortlist / player search (scouting) or older squad exports (history), loaded from a file into the current report. */
async function loadExtra(kind, files) {
  if (!lastInput || !files.length) return;
  const read = async (f) => ({ name: f.name, text: decode(await f.arrayBuffer()), exportedAt: null });
  const items = await Promise.all([...files].map(read));
  const from = { label: lastInput.label, fromGame: lastInput.fromGame, exportedAt: lastInput.exportedAt, scouting: lastInput.scouting, history: lastInput.history };
  if (kind === 'scouting') {
    from.scouting = items[0];
    from.focus = 'scouting';
  } else {
    const known = new Set(from.history.map((h) => h.name));
    from.history = [...from.history, ...items.filter((h) => !known.has(h.name))];
    from.focus = 'progress';
  }
  run(lastInput.text, lastInput.filename, from);
}

function openPicker() {
  if (!lastResult) return;
  const panel = $('picker');
  $('formation-panel').classList.add('hidden');
  $('idea-panel').classList.add('hidden');
  const current = loadPicks()[clubKey(lastResult.club)] || {};
  const ui = renderPicker(panel, lastResult, current, {
    onApply: (picks) => {
      const button = panel.querySelector('#pk-apply');
      button.disabled = true;
      panel.querySelector('#pk-msg').innerHTML = '<div class="working"><span>Rebuilding the tactic around your picks…</span><span class="track"><i></i></span></div>';
      setTimeout(() => {
        let result;
        try {
          result = analyseNow(lastInput.text, lastInput.filename, picks);
        } catch (err) {
          console.error(err);
          ui.showError(`Something went wrong: ${err.message}`);
          button.disabled = false;
          return;
        }
        if (!result.ok) {
          ui.showError(result.error);
          button.disabled = false;
          return;
        }
        savePicks(result.club, picks);
        showResult(result);
      }, 30);
    },
    onClose: () => panel.classList.add('hidden'),
  });
  panel.classList.remove('hidden');
  panel.scrollIntoView({ block: 'start' });
}

function openIdea() {
  if (!lastResult) return;
  const panel = $('idea-panel');
  $('picker').classList.add('hidden');
  $('formation-panel').classList.add('hidden');
  const current = loadIdeas()[clubKey(lastResult.club)] || { text: '', intensity: 1 };
  const ui = renderIdeaPanel(panel, lastResult, current, {
    onApply: (idea) => {
      panel.querySelector('#id-msg').innerHTML = `<div class="working"><span>${idea.text ? 'Building the tactic around your idea…' : 'Building the tactic without an idea…'}</span><span class="track"><i></i></span></div>`;
      setTimeout(() => {
        let result;
        try {
          result = analyseNow(lastInput.text, lastInput.filename, undefined, undefined, idea); // an empty idea means: none
        } catch (err) {
          console.error(err);
          ui.showError(`Something went wrong: ${err.message}`);
          return;
        }
        if (!result.ok) {
          ui.showError(result.error);
          return;
        }
        saveIdea(result.club, idea);
        showResult(result);
      }, 30);
    },
    onClose: () => panel.classList.add('hidden'),
  });
  panel.classList.remove('hidden');
  panel.scrollIntoView({ block: 'start' });
  panel.querySelector('#id-text').focus();
}

function openFormation() {
  if (!lastResult) return;
  const panel = $('formation-panel');
  $('picker').classList.add('hidden');
  $('idea-panel').classList.add('hidden');
  const current = loadFormations()[clubKey(lastResult.club)] || {};
  const ui = renderFormationPanel(panel, lastResult, currentDocs().formations, current, {
    onApply: (choice) => {
      panel.querySelector('#fm-msg').innerHTML = '<div class="working"><span>Rebuilding the tactic on your formation…</span><span class="track"><i></i></span></div>';
      setTimeout(() => {
        let result;
        try {
          result = analyseNow(lastInput.text, lastInput.filename, undefined, choice);
        } catch (err) {
          console.error(err);
          ui.showError(`Something went wrong: ${err.message}`);
          return;
        }
        if (!result.ok) {
          ui.showError(result.error);
          return;
        }
        saveFormation(result.club, choice);
        showResult(result);
      }, 30);
    },
    onClose: () => panel.classList.add('hidden'),
  });
  panel.classList.remove('hidden');
  panel.scrollIntoView({ block: 'start' });
}

async function readFile(file) {
  if (!file) return;
  if (file.size > 30 * 1024 * 1024) {
    setStatus('That file is very large (over 30 MB). Export only your squad, not the whole player database.', true);
    return;
  }
  const buffer = await file.arrayBuffer();
  run(decode(buffer), file.name);
}

/** The squad the FM27 plugin put into this page (F8), or null when the page was opened on its own. */
function readInjected() {
  try {
    const data = JSON.parse(document.getElementById('fm27tb-export')?.textContent || 'null');
    return data && typeof data.text === 'string' && data.text.trim() ? data : null;
  } catch {
    return null;
  }
}

function injectedLabel(data) {
  const at = data.exportedAt ? new Date(data.exportedAt) : null;
  const when = at && !Number.isNaN(at.getTime())
    ? at.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';
  return `Read from FM27${when ? ` · ${when}` : ''}`;
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function safeName(s) {
  return String(s || '').replace(/[\\/:*?"<>|]+/g, '').trim();
}

function init() {
  $('theme-toggle').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    if (next === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    remember(THEME_KEY, next);
  });

  const drop = $('drop');
  const input = $('file');
  $('choose').addEventListener('click', (e) => {
    e.stopPropagation();
    input.click();
  });
  $('sample').addEventListener('click', (e) => e.stopPropagation());
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('keydown', (e) => {
    if (e.target === drop && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', () => readFile(input.files[0]));
  for (const ev of ['dragenter', 'dragover']) {
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add('over');
    });
  }
  for (const ev of ['dragleave', 'drop']) drop.addEventListener(ev, () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    readFile(e.dataTransfer.files[0]);
  });
  // Dropping a file anywhere else should not navigate away from the app.
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!$('start').classList.contains('hidden') && e.dataTransfer?.files?.[0]) readFile(e.dataTransfer.files[0]);
  });

  $('sample').addEventListener('click', () => run(sampleCsv, 'squad_20261108_201500.csv (sample)', { label: 'Sample squad' }));
  $('print').addEventListener('click', () => window.print());
  $('choose-players').addEventListener('click', openPicker);
  $('formation-btn').addEventListener('click', openFormation);
  $('idea-btn').addEventListener('click', openIdea);
  // The Export menu closes once something is picked, or when you click elsewhere.
  const menu = $('export-menu');
  menu.addEventListener('click', (e) => {
    if (e.target.closest('.menu-items button')) menu.open = false;
  });
  document.addEventListener('click', (e) => {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  });
  $('extra-file').addEventListener('change', (e) => loadExtra(e.target.dataset.kind, e.target.files));
  const holder = $('report-holder');
  holder.addEventListener('change', (e) => {
    if (e.target.matches('.tick input')) {
      updateChecklist();
      saveChecks(lastSignature, [...$('setup').querySelectorAll('.tick input:checked')].map((b) => b.dataset.k));
    } else if (e.target.closest('#sfilter')) applyFilter();
    else if (e.target.closest('#mp-controls')) updateMatch();
  });
  holder.addEventListener('input', (e) => {
    if (e.target.id === 'sf-q') applyFilter();
  });
  holder.addEventListener('click', (e) => {
    if (e.target.id === 'mp-clear') {
      for (const i of $('mp-controls').querySelectorAll('input')) i.checked = i.type === 'radio' && i.value === '';
      updateMatch();
      return;
    }
    if (e.target.id === 'cb-clear') {
      for (const b of $('setup').querySelectorAll('.tick input')) b.checked = false;
      updateChecklist();
      saveChecks(lastSignature, []);
      return;
    }
    const load = e.target.closest('[data-load]');
    if (load) {
      const input = $('extra-file');
      input.dataset.kind = load.dataset.load;
      input.multiple = load.dataset.load === 'history';
      input.value = '';
      input.click();
      return;
    }
    const who = e.target.closest('.pname, .pl[data-pid]');
    if (who && !e.target.matches('input')) {
      e.preventDefault();
      openCard(who.dataset.pid);
    }
  });
  holder.addEventListener('keydown', (e) => {
    const who = e.target.closest?.('.pl[data-pid]');
    if (who && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openCard(who.dataset.pid);
    }
  });
  $('pcard-close').addEventListener('click', () => $('pcard').close?.() ?? $('pcard').removeAttribute('open'));
  $('pcard').addEventListener('click', (e) => {
    if (e.target === $('pcard')) $('pcard').close(); // click on the backdrop
  });
  $('print-sheet').addEventListener('click', () => {
    document.documentElement.classList.add('print-sheet');
    window.print();
    setTimeout(() => document.documentElement.classList.remove('print-sheet'), 500);
  });
  window.addEventListener('afterprint', () => document.documentElement.classList.remove('print-sheet'));
  $('share-image').addEventListener('click', () => {
    if (!lastResult) return;
    const club = safeName(lastResult.club);
    saveTacticImage(lastResult, `FM27 tactic${club ? ' - ' + club : ''}.png`, loadKit(lastResult.club));
  });
  // Change the team strength on the report itself (the plugin opens the page straight on the tactic).
  $('strength-quick').addEventListener('change', (e) => {
    const value = e.target.value;
    const radio = document.querySelector(`input[name="strength"][value="${CSS.escape(value)}"]`);
    if (radio) radio.checked = true;
    remember(STRENGTH_KEY, value);
    if (!lastInput) return;
    e.target.disabled = true;
    run(lastInput.text, lastInput.filename, { label: lastInput.label, fromGame: lastInput.fromGame });
  });
  $('save').addEventListener('click', () => {
    if (!lastResult) return;
    const date = new Date().toISOString().slice(0, 10);
    const club = safeName(lastResult.club);
    download(`FM27 tactic${club ? ' - ' + club : ''} - ${date}.html`, standaloneReport(lastResult, {
      theme: currentTheme(), match: loadMatch(lastResult.club), kit: loadKit(lastResult.club), fontCss: $('tb-fonts')?.textContent || '',
    }), 'text/html');
  });
  $('again').addEventListener('click', () => {
    $('result').classList.add('hidden');
    $('start').classList.remove('hidden');
    input.value = '';
    window.scrollTo(0, 0);
  });

  // Advanced: custom roles.json / tuning.json
  const jsonInput = $('json-file');
  const showJsonStatus = () => {
    const c = store(true) || {};
    const parts = [];
    if (c.roles) parts.push(`your roles.json (${c.roles.roles.length} roles)`);
    if (c.tuning) parts.push('your tuning.json');
    $('json-status').textContent = parts.length ? `Using ${parts.join(' and ')}.` : 'Using the built-in files.';
  };
  $('dl-roles').addEventListener('click', () => download('roles.json', JSON.stringify(currentDocs().roles, null, 2), 'application/json'));
  $('dl-tuning').addEventListener('click', () => download('tuning.json', JSON.stringify(currentDocs().tuning, null, 2), 'application/json'));
  $('load-json').addEventListener('click', () => jsonInput.click());
  $('reset-json').addEventListener('click', () => {
    store(false, {});
    showJsonStatus();
  });
  jsonInput.addEventListener('change', async () => {
    const file = jsonInput.files[0];
    if (!file) return;
    try {
      const doc = JSON.parse(await file.text());
      const custom = store(true) || {};
      if (Array.isArray(doc.roles) && doc.roles.every((r) => r.id && r.name && r.phase && Array.isArray(r.key))) custom.roles = doc;
      else if (doc.roleScore && doc.search) custom.tuning = doc;
      else throw new Error('This is neither a roles.json nor a tuning.json file.');
      store(false, custom);
      showJsonStatus();
    } catch (err) {
      $('json-status').textContent = `Could not use that file: ${err.message}`;
    }
    jsonInput.value = '';
  });
  showJsonStatus();

  // Remember the team-strength answer between visits (only in this browser).
  const saved = recall(STRENGTH_KEY);
  const radio = saved != null && document.querySelector(`input[name="strength"][value="${CSS.escape(saved)}"]`);
  if (radio) radio.checked = true;
  for (const r of document.querySelectorAll('input[name="strength"]')) {
    r.addEventListener('change', () => remember(STRENGTH_KEY, r.value));
  }

  // Opened by the FM27 plugin (F8): the squad is already inside this page, so build the tactic straight away.
  const injected = readInjected();
  if (injected) {
    run(injected.text, injected.name || 'squad.csv', {
      label: injectedLabel(injected),
      fromGame: true,
      exportedAt: injected.exportedAt,
      scouting: injected.scouting?.text ? injected.scouting : null,
      history: Array.isArray(injected.history) ? injected.history.filter((h) => h && h.text) : [],
      focus: injected.scouting?.text ? 'scouting' : null,
    });
  }
}

init();
