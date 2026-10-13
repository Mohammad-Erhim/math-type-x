import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseMathML, serializeMathML } from '../src/core/mathml';

function jsonFiles(d: string): string[] {
  return readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? jsonFiles(p) : p.endsWith('.json') ? [p] : [];
  });
}
function collect(o: unknown, out: Set<string>) {
  if (typeof o === 'string') { if (o.startsWith('<math') && o.endsWith('>')) out.add(o); }
  else if (Array.isArray(o)) o.forEach((v) => collect(v, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((v) => collect(v, out));
}

test('every MathML string produced by the reference round-trips byte for byte', () => {
  const strings = new Set<string>();
  for (const f of jsonFiles(join(process.cwd(), 'evidence'))) collect(JSON.parse(readFileSync(f, 'utf8')), strings);
  assert.ok(strings.size > 1000, 'evidence loaded');
  const bad: string[] = [];
  for (const s of strings) {
    if (s.length > 20000) continue;
    try {
      const d = parseMathML(s.includes('xmlns=') ? s : s.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"'));
      const out = serializeMathML(d.row, d.attrs, { xmlns: false });
      const want = s.replace(/ xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/, '');
      if (out !== want) bad.push(`${want}\n   -> ${out}`);
    } catch (e) { bad.push(s + ' !! ' + (e as Error).message); }
  }
  if (bad.length) console.log(bad.length, 'mismatches of', strings.size, '\n' + bad.slice(0, 12).join('\n'));
  assert.equal(bad.length, 0);
});
