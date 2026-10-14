/**
 * Length fields of the contextual tab (operator spacing, space width / height / depth, table spacings): a list of
 * values was typed into the real playground's field (tools/ctx_len.js, evidence/ctx_len_ref.json); the field must
 * accept / reject the same text and write the same MathML, and show the same value when it is opened again.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EditorCore } from '../src/core/engine';
import { DocGeometry } from '../src/layout/geometry';
import { handleKey } from '../src/core/keys';
import { locate, controlsFor, applyContext, ctxValue, parseLength } from '../src/core/context';

const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const norm = (s: string) => s.replace(NS, '').replace(' xmlns:wrs="http://www.wiris.com/xml/mathml-extension"', '').replace(/<math[^>]*>/, '<math>');
const CASES: Record<string, { mml: string; steps: number }> = {
  op_spacing: { mml: '<mi>a</mi><mo>+</mo><mi>b</mi>', steps: 1 },
  mspace: { mml: '<mi>a</mi><mspace width="1em" height="3ex" depth="2ex"/><mi>b</mi>', steps: 1 },
  table: { mml: '<mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable>', steps: 1 },
};
const data = JSON.parse(readFileSync(join(process.cwd(), 'evidence/ctx_len_ref.json'), 'utf8')) as Record<string, { open: boolean; mml: string; reopened: string | null }>;

function setup(name: string) {
  const c = CASES[name];
  const e = new EditorCore();
  e.geometry = new DocGeometry(e);
  e.setMathML(`<math${NS}>${c.mml}</math>`);
  const host = { ed: e, runGeneral() {} };
  handleKey(host as any, 'Home', {} as any);
  for (let i = 0; i < c.steps; i++) handleKey(host as any, 'ArrowRight', {} as any);
  return e;
}

test('length fields accept, reject and write like the reference', () => {
  const bad: string[] = [];
  let n = 0;
  for (const [key, rec] of Object.entries(data)) {
    const [cs, title, jv] = key.split('|');
    const v = JSON.parse(jv) as string;
    const base = norm(setup(cs).getMathML());
    const parsed = parseLength(v);
    n++;
    if (rec.open) {
      if (parsed !== null) bad.push(`${key}: reference keeps the panel open, we accept "${parsed}"`);
      continue;
    }
    const e = setup(cs);
    const loc = locate(e);
    const ctl = loc ? controlsFor(loc).find((c) => c.title === title) : undefined;
    if (!ctl) { bad.push(`${key}: no control`); continue; }
    if (norm(rec.mml) === base) {
      // closed without writing anything (50%, 1e2em): rejecting is fine too
      if (parsed !== null) {
        applyContext(e, ctl.id, parsed);
        if (norm(e.getMathML()) !== base) bad.push(`${key}: reference writes nothing, we write ${norm(e.getMathML())}`);
      }
      continue;
    }
    if (parsed === null) { bad.push(`${key}: reference accepts, we reject\n   want ${norm(rec.mml)}`); continue; }
    applyContext(e, ctl.id, parsed);
    const got = norm(e.getMathML());
    if (got !== norm(rec.mml)) bad.push(`${key}: want ${norm(rec.mml)}\n   got  ${got}`);
    const l2 = locate(e);
    const shown = l2 ? ctxValue(e, l2, ctl.id).value : undefined;
    // the reference's field keeps what was typed when the attribute is dropped (0 on a space); compare only written values
    if (rec.reopened !== null && shown !== rec.reopened && /="/.test(rec.mml)) {
      const wrote = new RegExp(`="${rec.reopened.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ "]`).test(rec.mml);
      if (wrote) bad.push(`${key}: reopened field shows "${shown}", reference "${rec.reopened}"`);
    }
  }
  assert.ok(n > 100);
  assert.equal(bad.length, 0, `${bad.length}/${n}:\n${bad.slice(0, 25).join('\n')}`);
});
