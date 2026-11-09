import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DOCS } from '../src/data.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const docs = DEFAULT_DOCS;
export const sample = (name) => readFileSync(join(ROOT, 'samples', name), 'utf8');
export const SAMPLE_FILES = [
  'squad_20261108_201500.csv',
  'squad_20261108_201500.html',
  'player_export_20261108_201500.csv',
  'scouted-ranges.csv',
  'missing-columns.csv',
];

/** A player object with every attribute set to `base`, then overrides applied. */
export function fakePlayer({ base = 10, attrs = {}, positions = ['M (C)'], bestPos, left = 0.5, right = 1, height = 180, name = 'Test Player' } = {}) {
  const all = {};
  for (const a of docs.columns.attributes) {
    const v = attrs[a.field] ?? base;
    all[a.field] = typeof v === 'object' ? v : { v, lo: v, hi: v, range: false };
  }
  return {
    id: name,
    name,
    positions: new Set(positions),
    bestPos: new Set(bestPos || [positions[0]]),
    isGoalkeeper: positions.length === 1 && positions[0] === 'GK',
    attrs: all,
    uncertainAttrs: [],
    unknownAttrs: [],
    heightCm: height,
    leftFoot: left,
    rightFoot: right,
    traits: [],
    injured: false,
  };
}
