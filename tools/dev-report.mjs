// Developer helper: build a report from an export file without the browser.
// Usage: npm run report -- samples/squad_20261108_201500.csv out/report.html [strength -2..2]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { analyse } from '../src/analyse.js';
import { DEFAULT_DOCS } from '../src/data.js';
import { standaloneReport } from '../src/report/render.js';

const [input = 'samples/squad_20261108_201500.csv', output = 'out/report.html', strength = '0'] = process.argv.slice(2);
const t0 = performance.now();
const result = analyse(readFileSync(input, 'utf8'), basename(input), DEFAULT_DOCS, { strength: Number(strength) });
if (!result.ok) {
  console.error('Could not build a tactic:', result.error);
  process.exit(1);
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, standaloneReport(result));
const b = result.search.best;
console.log(`${b.ipName} / ${b.oopName}  fit ${b.fit.toFixed(1)}  score ${b.score.toFixed(1)}  (${result.search.tested} systems, ${Math.round(performance.now() - t0)} ms)`);
console.log(`Wrote ${output}`);
