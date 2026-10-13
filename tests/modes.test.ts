import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { EditorCore } from '../src/core/engine';
import { catalogue } from '../src/core/catalogue';

const EMPTY = '<math xmlns="http://www.w3.org/1998/Math/MathML"/>';
const dec = (x: string) => x.replace(/&#x([0-9A-Fa-f]+);/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)));

/** Bold / Italic switched on, a toolbar control used, "a" typed (reference probe tools/probe_modes.js) */
test('formatting modes apply to inserted fragments like the reference', () => {
  const files = ['modes_ref_visible.json', 'modes_none_visible.json', 'modes_ref_popup.json', 'modes_regular_auto_ref.json'].map((f) => join(process.cwd(), 'evidence', f)).filter(existsSync);
  assert.ok(files.length >= 2);
  const byKey = new Map<string, any[]>();
  for (const c of catalogue.controls as any[]) {
    const k = `${c.tab}|${c.title}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(c);
  }
  const run = (c: any, mode: string): string => {
    const ed = new EditorCore();
    ed.setMathML(EMPTY);
    if (mode.startsWith('Bold')) ed.toggleBold();
    if (mode.startsWith('Italic')) ed.toggleItalic();
    if (mode.startsWith('Regular')) ed.setRegularText(true);
    if (mode.startsWith('Automatic')) ed.setAutoItalic(false);
    ed.activate({ id: c.id, A: c.A, A2: c.A2, B: c.B, C: c.C });
    ed.typeText('a');
    return ed.getMathML().replace(/ xmlns="[^"]+"/, '');
  };
  let n = 0;
  const bad: string[] = [];
  for (const f of files) {
    const data: Record<string, string> = JSON.parse(readFileSync(f, 'utf8'));
    for (const [key, want] of Object.entries(data)) {
      if (want.startsWith('ERR') || want === '<math/>') continue; // pop-ups the probe could not drive
      const parts = key.split('|');
      const mode = parts[parts.length - 1];
      const title = parts[parts.length - 2];
      const cands = byKey.get(`${parts[0]}|${title}`);
      if (!cands) continue;
      n++;
      if (!cands.some((c) => dec(run(c, mode)) === dec(want))) bad.push(`${key}\n  want ${dec(want).slice(0, 150)}\n  got  ${dec(run(cands[0], mode)).slice(0, 150)}`);
    }
  }
  console.log(`modes: ${n - bad.length}/${n} equal`);
  if (bad.length) console.log(bad.slice(0, 8).join('\n'));
  assert.ok(n > 800);
  assert.ok((n - bad.length) / n > 0.97);
});
