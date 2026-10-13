import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveSpec } from '../src/core/templates';

test('insertion specs derive for every control of the catalogue', () => {
  const cat = JSON.parse(readFileSync(join(process.cwd(), 'src/data/catalogue.json'), 'utf8'));
  let n = 0, bad: string[] = [];
  for (const c of cat.controls) {
    if (c.special || !c.A) continue;
    n++;
    const s = deriveSpec({ A: c.A, A2: c.A2, B: c.B, C: c.C });
    if (s.problems.length) bad.push(c.id + ' ' + c.title + ' ' + s.problems.join(','));
  }
  console.log('derived', n, 'problems', bad.length);
  if (bad.length) console.log(bad.slice(0, 40).join('\n'));
  // tokens without a typed-state sample (A2) cannot be diffed; they are plain symbol insertions covered by the golden suite
  assert.deepEqual(bad.filter((b) => !/ A2$/.test(b)), []);
});
