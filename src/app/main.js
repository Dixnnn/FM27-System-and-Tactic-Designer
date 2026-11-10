// Browser app: file in -> report out. Everything happens inside the page; nothing is sent anywhere.

import { analyse } from '../analyse.js';
import { DEFAULT_DOCS } from '../data.js';
import { renderReport, standaloneReport } from '../report/render.js';
import { REPORT_CSS } from '../report/report-css.js';
import { esc } from '../report/util.js';
import sampleCsv from '../../samples/squad_20261108_201500.csv';

const STORE_KEY = 'fm27-tactic-builder.custom-docs';
const $ = (id) => document.getElementById(id);

let lastResult = null;

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
  $('status').innerHTML = isError ? `<div class="error">${html}</div>` : html;
}

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
  let extra = '';
  if (c && (c.missingEssential.length || c.fatal)) {
    const list = c.missingEssential.slice(0, 20).map((m) => `<li><strong>${esc(m.label)}</strong>${m.menu ? ` – Insert Column › ${esc(m.menu)}` : ''}</li>`).join('');
    if (list) extra = `<p>Columns to add to your squad view in FM27:</p><ul>${list}</ul>`;
  }
  setStatus(`<strong>That file couldn't be used.</strong> ${esc(result.error)}${extra}`, true);
}

function run(text, filename) {
  setStatus('Working out your tactic… (this takes a few seconds)');
  setTimeout(() => {
    let result;
    try {
      result = analyse(text, filename, currentDocs(), { excludeInjured: $('opt-injured').checked, strength: Number($('opt-strength').value) });
    } catch (err) {
      console.error(err);
      setStatus(`<strong>Something went wrong while reading the file.</strong> ${esc(err.message)}. If this keeps happening, see "Common problems" in the README.`, true);
      return;
    }
    if (!result.ok) {
      showError(result);
      return;
    }
    lastResult = result;
    $('report-holder').innerHTML = renderReport(result);
    $('start').classList.add('hidden');
    $('result').classList.remove('hidden');
    setStatus('');
    window.scrollTo(0, 0);
  }, 30);
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
  const style = document.createElement('style');
  style.textContent = REPORT_CSS;
  document.head.appendChild(style);

  const drop = $('drop');
  const input = $('file');
  $('choose').addEventListener('click', () => input.click());
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') input.click();
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

  $('sample').addEventListener('click', () => run(sampleCsv, 'squad_20261108_201500.csv (sample)'));
  $('print').addEventListener('click', () => window.print());
  $('save').addEventListener('click', () => {
    if (!lastResult) return;
    const date = new Date().toISOString().slice(0, 10);
    const club = safeName(lastResult.club);
    download(`FM27 tactic${club ? ' - ' + club : ''} - ${date}.html`, standaloneReport(lastResult), 'text/html');
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
  const strength = $('opt-strength');
  try {
    const saved = localStorage.getItem('fm27-tactic-builder.strength');
    if (saved != null && [...strength.options].some((o) => o.value === saved)) strength.value = saved;
  } catch {
    /* storage unavailable: keep the default */
  }
  strength.addEventListener('change', () => {
    try {
      localStorage.setItem('fm27-tactic-builder.strength', strength.value);
    } catch {
      /* ignore */
    }
  });
}

init();
