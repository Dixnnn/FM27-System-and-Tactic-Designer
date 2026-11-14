// One export row -> one Player object. Only reads values; nothing is guessed silently:
// scouting ranges become their midpoint with an "uncertain" flag, unknown values ("-") stay unknown.

import { parsePositions } from './positions.js';

/** "14" -> {v:14}; "11-14" -> {v:12.5, lo:11, hi:14, range:true}; "-" / "" -> null */
export function parseAttribute(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/[–—]/g, '-');
  if (!s || s === '-' || s === '?' || /^n\/?a$/i.test(s)) return null;
  const range = /^(\d{1,2})\s*-\s*(\d{1,2})$/.exec(s);
  if (range) {
    const lo = clampAttr(Number(range[1]));
    const hi = clampAttr(Number(range[2]));
    const a = Math.min(lo, hi);
    const b = Math.max(lo, hi);
    return { v: (a + b) / 2, lo: a, hi: b, range: a !== b };
  }
  const n = /^(\d{1,2})(?:[.,]\d+)?$/.exec(s);
  if (n) {
    const v = clampAttr(Number(n[1]));
    return { v, lo: v, hi: v, range: false };
  }
  return null;
}

function clampAttr(n) {
  return Math.max(1, Math.min(20, n));
}

/** "193 cm" -> 193; "6'4\"" -> 193; "1.93 m" -> 193 */
export function parseHeight(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = /^(\d{3})\s*cm$/i.exec(s) || /^(\d{3})$/.exec(s);
  if (m) return Number(m[1]);
  m = /^(\d)[.,](\d{2})\s*m$/i.exec(s);
  if (m) return Number(m[1]) * 100 + Number(m[2]);
  m = /^(\d)\s*(?:'|ft)\s*(\d{1,2})?\s*(?:"|''|in)?$/i.exec(s);
  if (m) return Math.round((Number(m[1]) * 12 + Number(m[2] || 0)) * 2.54);
  return null;
}

export function parseNumber(raw, decimalComma = false) {
  if (raw == null) return null;
  let s = String(raw).trim().replace('%', '');
  if (!s || s === '-') return null;
  if (decimalComma) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function footStrength(raw, tuning) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  for (const [label, value] of Object.entries(tuning.foot.strength)) {
    if (label.toLowerCase() === s) return value;
  }
  return null;
}

function splitList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\s*(?:,|;|\||\n| \/ )\s*/)
    .map((s) => s.trim())
    .filter((s) => s && s !== '-');
}

const CONDITION_WORDS = { 'fully fit': 100, 'match fit': 95, fit: 90, 'slightly tired': 85, tired: 75, 'very tired': 65, exhausted: 55 };

function parseCondition(raw, decimalComma) {
  const n = parseNumber(raw, decimalComma);
  if (n != null) return n <= 1 ? Math.round(n * 100) : n;
  const w = CONDITION_WORDS[String(raw || '').trim().toLowerCase()];
  return w ?? null;
}

function cleanText(raw) {
  const s = String(raw ?? '').trim();
  return s && s !== '-' ? s : '';
}

/**
 * @param {{headers:string[], rows:string[][], decimalComma:boolean}} table
 * @param {{fields:Object, attributes:Object}} map  from buildHeaderMap
 * @param {object} columnsDoc  data/columns.json
 * @param {object} tuning  data/tuning.json
 */
export function parsePlayers(table, map, columnsDoc, tuning) {
  const attrNames = columnsDoc.attributes.map((a) => a.field);
  const get = (row, field) => (field in map.fields ? row[map.fields[field]] : undefined);
  const players = [];
  const seenNames = new Map();
  table.rows.forEach((row, index) => {
    const name = cleanText(get(row, 'name'));
    if (!name) return;
    const attrs = {};
    const uncertainAttrs = [];
    const unknownAttrs = [];
    for (const a of attrNames) {
      if (!(a in map.attributes)) {
        attrs[a] = null;
        continue;
      }
      const value = parseAttribute(row[map.attributes[a]]);
      attrs[a] = value;
      if (!value) unknownAttrs.push(a);
      else if (value.range && value.hi - value.lo >= 2) uncertainAttrs.push(a);
    }
    const positions = parsePositions(get(row, 'position'));
    for (const p of parsePositions(get(row, 'secPosition'))) positions.add(p);
    const bestPos = parsePositions(get(row, 'bestPos'));
    for (const p of bestPos) positions.add(p);

    let left = footStrength(get(row, 'leftFoot'), tuning);
    let right = footStrength(get(row, 'rightFoot'), tuning);
    const preferredFoot = cleanText(get(row, 'preferredFoot'));
    if (left == null && right == null && preferredFoot) {
      const p = preferredFoot.toLowerCase();
      if (p.startsWith('left')) [left, right] = [1, p.includes('only') ? 0 : 0.25];
      else if (p.startsWith('right')) [left, right] = [p.includes('only') ? 0 : 0.25, 1];
      else if (p.startsWith('either')) [left, right] = [0.85, 0.85];
    }

    const injury = cleanText(get(row, 'injury'));
    const info = cleanText(get(row, 'info'));
    const injured = (!!injury && !/^(none|no|fit)$/i.test(injury)) || /\binj/i.test(info);
    const suspended = /\b(ban|sus)/i.test(info);

    const uid = cleanText(get(row, 'id'));
    let id = uid || name;
    if (seenNames.has(id)) id = `${id} #${index + 1}`;
    seenNames.set(id, true);

    players.push({
      id,
      uid,
      name,
      age: parseNumber(get(row, 'age')),
      club: cleanText(get(row, 'club')),
      positionsText: cleanText(get(row, 'position')),
      positions,
      bestPos,
      isGoalkeeper: positions.has('GK') && positions.size === 1,
      attrs,
      uncertainAttrs,
      unknownAttrs,
      heightCm: parseHeight(get(row, 'height')),
      preferredFoot,
      leftFoot: left,
      rightFoot: right,
      personality: cleanText(get(row, 'personality')),
      traits: splitList(get(row, 'traits')),
      condition: parseCondition(get(row, 'condition'), table.decimalComma),
      sharpness: parseCondition(get(row, 'sharpness'), table.decimalComma),
      fatigue: cleanText(get(row, 'fatigue')),
      injury,
      info,
      injured,
      suspended,
      rating: parseNumber(get(row, 'rating'), table.decimalComma),
      ability: parseNumber(get(row, 'ability'), table.decimalComma),
      potential: parseNumber(get(row, 'potential'), table.decimalComma),
      playingTime: cleanText(get(row, 'playingTime')),
      wage: cleanText(get(row, 'wage')),
      transferValue: cleanText(get(row, 'transferValue')),
      mediaHandling: cleanText(get(row, 'mediaHandling')),
      onLoan: false,
      fmBestRole: cleanText(get(row, 'bestRole')),
      fmRoleStars: parseNumber(get(row, 'roleAbility'), table.decimalComma),
      fmRoleStarsOOP: parseNumber(get(row, 'roleAbilityOOP'), table.decimalComma),
    });
  });
  return players;
}
