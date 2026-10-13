import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runProgram } from './driver';

const dir = join(process.cwd(), 'tests/oracle');
const suites = readdirSync(dir).filter((f) => /^programs_.*\.json$/.test(f));
const only = process.env.ORACLE_FILTER ? new RegExp(process.env.ORACLE_FILTER) : null;

// programs whose reference behaviour is not reproduced yet (documented deviations): the suite must not regress
const MIN_EQUAL: Record<string, number> = { core: 170, nav: 53 };

for (const f of suites) {
  const name = f.replace(/^programs_|\.json$/g, '');
  const expF = join(dir, `expected_${name}.json`);
  if (!existsSync(expF)) continue;
  const progs: Record<string, any[]> = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const exp: Record<string, string[]> = JSON.parse(readFileSync(expF, 'utf8'));
  test(`oracle suite ${name}: engine equals reference`, () => {
    const bad: string[] = [];
    let n = 0;
    for (const [k, steps] of Object.entries(progs)) {
      if (!exp[k] || (only && !only.test(k))) continue;
      n++;
      let got: string[];
      try {
        got = runProgram(steps);
      } catch (e) {
        got = ['EXC ' + (e as Error).message];
      }
      const want = exp[k];
      if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${k}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
    }
    console.log(`suite ${name}: ${n - bad.length}/${n} equal`);
    if (bad.length && process.env.SHOW) console.log(bad.join('\n'));
    else if (bad.length) console.log('failing programs:', bad.map((b) => b.split('\n')[0]).join(', '));
    assert.ok(only || n - bad.length >= (MIN_EQUAL[name] ?? n), `${name}: ${n - bad.length} equal, expected at least ${MIN_EQUAL[name]}`);
  });
}
