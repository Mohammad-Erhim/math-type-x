import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { mathml2accessible } from '../src/convert/speech';

const dir = join(process.cwd(), 'tests/oracle');
test('accessible text matches the reference service on the control corpus', () => {
  const corpus: Record<string, { acc: string }> = JSON.parse(readFileSync(join(dir, 'services_catalogue.json'), 'utf8'));
  const bad: string[] = [];
  let n = 0;
  for (const [mml, v] of Object.entries(corpus)) {
    if (!v.acc || v.acc.startsWith('Error')) continue;
    n++;
    let got = '';
    try { got = mathml2accessible(mml); } catch (e) { got = 'EXC ' + (e as Error).message; }
    if (got !== v.acc) bad.push(`${mml.replace(' xmlns="http://www.w3.org/1998/Math/MathML"', '').slice(0, 160)}\n    want ${v.acc}\n    got  ${got}`);
  }
  console.log(`speech: ${n - bad.length}/${n} equal`);
  if (process.env.SHOW) console.log(bad.slice(0, +process.env.SHOW).join('\n'));
  assert.ok(n - bad.length > 0);
});

test('accessible text on the LaTeX corpus', () => {
  const corpus: Record<string, { mml: string; acc: string }> = JSON.parse(readFileSync(join(dir, 'services_latex.json'), 'utf8'));
  const bad: string[] = [];
  let n = 0;
  for (const [tex, v] of Object.entries(corpus)) {
    if (!v.mml || !v.acc || v.acc.startsWith('Error')) continue;
    n++;
    let got = '';
    try { got = mathml2accessible(v.mml); } catch (e) { got = 'EXC ' + (e as Error).message; }
    if (got !== v.acc) bad.push(`${tex}\n    mml  ${v.mml.replace(' xmlns="http://www.w3.org/1998/Math/MathML"', '').slice(0, 200)}\n    want ${v.acc}\n    got  ${got}`);
  }
  console.log(`speech(latex corpus): ${n - bad.length}/${n} equal`);
  if (process.env.SHOWL) console.log(bad.slice(0, +process.env.SHOWL).join('\n'));
  assert.ok(n > 0);
});

test('accessible text on the second probe corpus', () => {
  const corpus: Record<string, { acc: string }> = JSON.parse(readFileSync(join(dir, 'services_speech2.json'), 'utf8'));
  const bad: string[] = [];
  let n = 0;
  for (const [mml, v] of Object.entries(corpus)) {
    if (!v.acc || v.acc.startsWith('Error') || v.acc.includes('<!DOCTYPE')) continue;
    n++;
    let got = '';
    try { got = mathml2accessible(mml); } catch (e) { got = 'EXC ' + (e as Error).message; }
    if (got !== v.acc) bad.push(`${mml.replace(' xmlns="http://www.w3.org/1998/Math/MathML"', '').slice(0, 160)}\n    want ${JSON.stringify(v.acc)}\n    got  ${JSON.stringify(got)}`);
  }
  console.log(`speech(2): ${n - bad.length}/${n} equal`);
  if (process.env.SHOW2) console.log(bad.slice(0, +process.env.SHOW2).join('\n'));
  assert.ok(n > 0);
});

import { mathml2latex } from '../src/convert/tex';
test('LaTeX from MathML matches the reference service', () => {
  const a: Record<string, { tex: string }> = JSON.parse(readFileSync(join(dir, 'services_catalogue.json'), 'utf8'));
  const b: Record<string, { mml: string; back: string }> = JSON.parse(readFileSync(join(dir, 'services_latex.json'), 'utf8'));
  const cases: [string, string][] = [];
  for (const [m, v] of Object.entries(a)) if (v.tex && !v.tex.startsWith('Error')) cases.push([m, v.tex]);
  for (const v of Object.values(b)) if (v.mml && v.back && !v.back.startsWith('Error') && !v.mml.startsWith('Error')) cases.push([v.mml, v.back]);
  const bad: string[] = [];
  for (const [m, want] of cases) {
    let got = '';
    try { got = mathml2latex(m); } catch (e) { got = 'EXC ' + (e as Error).message; }
    if (got !== want) bad.push(`${m.replace(' xmlns="http://www.w3.org/1998/Math/MathML"', '').slice(0, 150)}\n    want ${want}\n    got  ${got}`);
  }
  console.log(`latex: ${cases.length - bad.length}/${cases.length} equal`);
  if (process.env.SHOWT) console.log(bad.slice(0, +process.env.SHOWT).join('\n'));
  assert.ok(cases.length > 0);
});

import { latex2mathml } from '../src/convert/latex';
test('LaTeX to MathML matches the reference service', () => {
  const b: Record<string, { mml: string }> = JSON.parse(readFileSync(join(dir, 'services_latex.json'), 'utf8'));
  const bad: string[] = [];
  let n = 0;
  for (const [tex, v] of Object.entries(b)) {
    if (!v.mml || v.mml.startsWith('Error')) continue;
    n++;
    let got = '';
    try { got = latex2mathml(tex); } catch (e) { got = 'EXC ' + (e as Error).message; }
    if (got !== v.mml) bad.push(`${tex}\n    want ${v.mml.replace(' xmlns="http://www.w3.org/1998/Math/MathML"', '')}\n    got  ${got.replace(' xmlns="http://www.w3.org/1998/Math/MathML"', '')}`);
  }
  console.log(`latex2mathml: ${n - bad.length}/${n} equal`);
  if (process.env.SHOWM) console.log(bad.slice(0, +process.env.SHOWM).join('\n'));
  assert.ok(n > 0);
});

import { mathml2latex as texOf } from '../src/convert/tex';
// stacks, long division and the formulas the reference service refuses (tests/oracle/services_stack.json, recorded live)
test('conversion services answer stacks and unsupported input like the reference', () => {
  const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
  const d: Record<string, { acc: string; tex: string }> = JSON.parse(readFileSync(join(dir, 'services_stack.json'), 'utf8'));
  const bad: string[] = [];
  let n = 0;
  for (const [c, v] of Object.entries(d)) {
    const m = `<math ${NS}>${c}</math>`;
    let acc: string;
    let tex: string;
    try {
      acc = mathml2accessible(m);
    } catch {
      acc = 'Error converting from MathML to accessible text.';
    }
    try {
      tex = texOf(m);
    } catch {
      tex = 'Error converting from MathML to LaTeX';
    }
    n++;
    if (acc !== v.acc) bad.push(`acc ${c.slice(0, 70)}\n    want ${v.acc}\n    got  ${acc}`);
    if (tex !== v.tex) bad.push(`tex ${c.slice(0, 70)}\n    want ${v.tex}\n    got  ${tex}`);
  }
  console.log(`services (stacks / refusals): ${2 * n - bad.length}/${2 * n} equal`);
  if (bad.length) console.log(bad.slice(0, 10).join('\n'));
  assert.equal(bad.length, 0);
});
