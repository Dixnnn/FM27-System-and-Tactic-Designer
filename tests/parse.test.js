import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAttribute, parseHeight, parseNumber, parsePlayers } from '../src/parse/player.js';
import { parsePositions, familiarity, buildAdjacency } from '../src/parse/positions.js';
import { buildHeaderMap } from '../src/parse/columns.js';
import { checkColumns } from '../src/parse/validate.js';
import { readExport } from '../src/input/index.js';
import { docs, sample, SAMPLE_FILES } from './helpers.js';

test('attribute values: exact, scouting range (midpoint + flag), unknown', () => {
  assert.deepEqual(parseAttribute('14'), { v: 14, lo: 14, hi: 14, range: false });
  assert.deepEqual(parseAttribute('11-14'), { v: 12.5, lo: 11, hi: 14, range: true });
  assert.deepEqual(parseAttribute('11 – 14'), { v: 12.5, lo: 11, hi: 14, range: true });
  assert.deepEqual(parseAttribute('15-12'), { v: 13.5, lo: 12, hi: 15, range: true });
  assert.equal(parseAttribute('-'), null);
  assert.equal(parseAttribute(''), null);
  assert.equal(parseAttribute('n/a'), null);
  assert.equal(parseAttribute('25').v, 20, 'clamped to 20');
});

test('height in cm, metres and feet/inches', () => {
  assert.equal(parseHeight('193 cm'), 193);
  assert.equal(parseHeight('1.85 m'), 185);
  assert.equal(parseHeight(`6'1"`), 185);
  assert.equal(parseHeight('5ft 10in'), 178);
  assert.equal(parseHeight(''), null);
});

test('numbers with decimal commas and percentages', () => {
  assert.equal(parseNumber('4,5', true), 4.5);
  assert.equal(parseNumber('95%'), 95);
  assert.equal(parseNumber('-'), null);
});

test('FM position strings', () => {
  const p = parsePositions('D/WB (RL), DM, M/AM (RLC), ST (C)');
  for (const pos of ['D (R)', 'D (L)', 'WB (R)', 'WB (L)', 'DM', 'M (R)', 'M (L)', 'M (C)', 'AM (R)', 'AM (L)', 'AM (C)', 'ST (C)']) {
    assert.ok(p.has(pos), pos);
  }
  assert.equal(p.has('WB (C)'), false);
  assert.deepEqual([...parsePositions('GK')], ['GK']);
  assert.deepEqual([...parsePositions('ST')], ['ST (C)']);
  assert.equal(parsePositions('').size, 0);
});

test('familiarity: best position, listed, neighbouring, awkward', () => {
  const adj = buildAdjacency(docs.tuning);
  const player = { positions: new Set(['D (R)', 'D (C)']), bestPos: new Set(['D (R)']) };
  assert.equal(familiarity(player, 'D (R)', adj), 'Natural');
  assert.equal(familiarity(player, 'D (C)', adj), 'Accomplished');
  assert.equal(familiarity(player, 'WB (R)', adj), 'Competent');
  assert.equal(familiarity(player, 'DM', adj), 'Unconvincing');
  assert.equal(familiarity(player, 'ST (C)', adj), 'Awkward');
  assert.equal(familiarity(player, 'GK', adj), 'Awkward');
  const gk = { positions: new Set(['GK']), bestPos: new Set(['GK']) };
  assert.equal(familiarity(gk, 'D (C)', adj), 'Awkward');
});

function load(name) {
  const t = readExport(sample(name), name);
  const map = buildHeaderMap(t.headers, docs.columns, t.adapter.aliases);
  return { t, map, players: parsePlayers(t, map, docs.columns, docs.tuning), check: checkColumns(map, docs.columns) };
}

test('every sample file gives the same 29 players', () => {
  for (const f of SAMPLE_FILES) {
    const { players } = load(f);
    assert.equal(players.length, 29, f);
    assert.equal(players[0].name, 'Callum Ashdown', f);
  }
});

test('player fields: feet, height, traits, injury, playing time (real FM27 export layout)', () => {
  const { players } = load('squad_20261108_201500.csv');
  const injured = players.filter((p) => p.injured);
  assert.equal(injured.length, 1);
  assert.equal(injured[0].injury, 'Hamstring Strain');
  const leftBack = players.find((p) => p.positionsText === 'D/WB (L)');
  assert.equal(leftBack.leftFoot, 1);
  assert.ok(leftBack.traits.includes('Gets Forward Whenever Possible'));
  assert.equal(typeof leftBack.heightCm, 'number');
  assert.equal(leftBack.condition, null, 'FM27 exports leave the CON column empty (it is an icon)');
  assert.ok(leftBack.positions.has('WB (L)'));
  assert.deepEqual(players.find((p) => p.name === 'Callum Ashdown').traits, ['Tries To Play Way Out Of Trouble']);
  assert.deepEqual(players[2].traits, [], 'a "-" trait means none');
  assert.equal(players.filter((p) => p.playingTime === 'Out On Loan').length, 3);
});

test('"Right-Footed Only" style preferred foot is understood when foot columns are missing', () => {
  const csv = 'Player,Position,Preferred Foot,Pace,Acceleration,Passing,Tackling,Marking,Finishing,Heading,Crossing,Dribbling,Technique,Vision\n' +
    'A,GK,Right-Footed Only,1,1,1,1,1,1,1,1,1,1,1\nB,ST (C),Left-Footed,1,1,1,1,1,1,1,1,1,1,1\n';
  const t = readExport(csv, 'x.csv');
  const ps = parsePlayers(t, buildHeaderMap(t.headers, docs.columns), docs.columns, docs.tuning);
  assert.deepEqual([ps[0].leftFoot, ps[0].rightFoot], [0, 1]);
  assert.deepEqual([ps[1].leftFoot, ps[1].rightFoot], [1, 0.25]);
});

test('scouting ranges are flagged as uncertain', () => {
  const { players } = load('scouted-ranges.csv');
  const p = players[0];
  assert.ok(p.uncertainAttrs.length > 0);
  const ranged = Object.values(p.attrs).find((a) => a && a.range);
  assert.ok(ranged.lo < ranged.v && ranged.v < ranged.hi);
});

test('missing columns are listed with FM27 menu paths', () => {
  const { check, players } = load('missing-columns.csv');
  const labels = check.missingEssential.map((m) => m.label);
  assert.deepEqual(labels.sort(), ['Marking', 'Off the Ball', 'Work Rate']);
  const height = check.missingRecommended.find((m) => m.label === 'Height');
  assert.equal(height.menu, 'General > Height');
  assert.equal(check.fatal, null);
  // Without Left/Right Foot columns, Preferred Foot is used instead
  assert.ok(players.every((p) => p.leftFoot != null && p.rightFoot != null));
});

test('a file without attributes is refused with a plain message', () => {
  const t = readExport('Player,Club\nA,B\n', 'x.csv');
  const check = checkColumns(buildHeaderMap(t.headers, docs.columns), docs.columns);
  assert.match(check.fatal, /attributes/);
});

test('FM24-style abbreviated headers are understood', () => {
  const map = buildHeaderMap(['Name', 'Position', 'Acc', 'Pac', 'Pos', 'Tea', 'Wor', 'Fir'], docs.columns);
  assert.equal(map.fields.name, 0);
  assert.equal(map.fields.position, 1);
  assert.deepEqual(Object.keys(map.attributes).sort(), ['Acceleration', 'First Touch', 'Pace', 'Positioning', 'Teamwork', 'Work Rate']);
});
