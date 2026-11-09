import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, detectDelimiter } from '../src/input/csv.js';
import { parseHTMLTable, decodeEntities } from '../src/input/html.js';
import { readExport } from '../src/input/index.js';
import { sample } from './helpers.js';

test('detects comma, semicolon and tab separators', () => {
  assert.equal(detectDelimiter('a,b,c\n1,2,3'), ',');
  assert.equal(detectDelimiter('a;b;c\n1;2;3'), ';');
  assert.equal(detectDelimiter('a\tb\tc\n1\t2\t3'), '\t');
  assert.equal(detectDelimiter('"x;y",b,c\n1,2,3'), ',', 'separators inside quotes are ignored');
});

test('reads quoted fields, escaped quotes, line breaks in quotes and a BOM', () => {
  const t = parseCSV('﻿Player,Trait\r\n"Smith, John","Says ""hi""\nloudly"\r\nJones,\r\n');
  assert.deepEqual(t.headers, ['Player', 'Trait']);
  assert.deepEqual(t.rows[0], ['Smith, John', 'Says "hi"\nloudly']);
  assert.deepEqual(t.rows[1], ['Jones', '']);
  assert.equal(t.rows.length, 2);
});

test('pads short rows and skips blank lines', () => {
  const t = parseCSV('a,b,c\n1\n\n2,3,4\n');
  assert.deepEqual(t.rows, [['1', '', ''], ['2', '3', '4']]);
});

test('spots decimal commas in semicolon files', () => {
  assert.equal(parseCSV('a;b\n4,5;7,12\n3,0;6,90\n').decimalComma, true);
  assert.equal(parseCSV('a;b\n4.5;7.12\n').decimalComma, false);
});

test('HTML tables: header row, entities, colspan, tags inside cells', () => {
  const html = `<html><head><title>Squad</title></head><body><table>
    <tr><th>Player</th><th>Club</th><th>Pace</th></tr>
    <tr><td><a href="#">O&#39;Brien &amp; Co</a></td><td>A&nbsp;B</td><td>14</td></tr>
    <tr><td colspan="2">Wide</td><td>9</td></tr></table></body></html>`;
  const t = parseHTMLTable(html);
  assert.deepEqual(t.headers, ['Player', 'Club', 'Pace']);
  assert.deepEqual(t.rows[0], ["O'Brien & Co", 'A B', '14']);
  assert.deepEqual(t.rows[1], ['Wide', '', '9']);
  assert.equal(t.title, 'Squad');
  assert.equal(decodeEntities('&lt;b&gt; &#x41;'), '<b> A');
});

test('recognises each export route', () => {
  assert.equal(readExport(sample('squad_20261108_201500.csv'), 'squad_20261108_201500.csv').adapter.id, 'fm-view-exporter');
  assert.equal(readExport(sample('squad_20261108_201500.html'), 'squad_20261108_201500.html').format, 'html');
  const v = readExport(sample('player_export_20261108_201500.csv'), 'player_export_20261108_201500.csv');
  assert.equal(v.adapter.id, 'fm27-player-export');
  assert.equal(v.delimiter, ';');
  assert.equal(v.decimalComma, true);
});

test('empty and header-only files give a warning, not a crash', () => {
  assert.match(readExport('', 'x.csv').warnings[0], /no table/);
  assert.match(readExport('Player,Pace\n', 'x.csv').warnings[0], /no players/);
});
