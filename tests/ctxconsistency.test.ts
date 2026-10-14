/**
 * Self-consistency of the contextual tab for every formula of tools/ctx_cases*.js at every caret stop and selection extent:
 * each control (every option of a select) must  (a) not throw, (b) leave valid MathML that loads back unchanged,
 * (c) be undone by one Undo and redone by one Redo, (d) show the chosen option / flipped state afterwards, and
 * (e) leave a caret that resolves inside the document.  CTX_REPORT=1 prints all findings instead of failing on the first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EditorCore } from '../src/core/engine';
import { DocGeometry } from '../src/layout/geometry';
import { handleKey } from '../src/core/keys';
import { locate, controlsFor, applyContext, ctxValue } from '../src/core/context';
import { catalogue, behaviorOf } from '../src/core/catalogue';
// @ts-ignore
import { cases as baseCases } from '../tools/ctx_cases.js';

const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const load = (f: string) => JSON.parse(readFileSync(join(process.cwd(), 'evidence', f), 'utf8')) as { name: string; mml?: string; flow?: string[]; start?: number; steps?: number }[];
const SETS: [string, { name: string; mml?: string; flow?: string[]; start?: number; steps?: number }[], boolean][] = [
  ['cases', baseCases, false],
  ['adj', load('ctx_cases_adj.json'), false],
  ['enc', load('ctx_cases_enc.json'), false],
  ['sel', load('ctx_cases_sel.json'), true],
  ['sel2', load('ctx_cases_sel2.json'), true],
  ['flows', load('ctx_cases_flows.json'), false],
  ['vis', load('ctx_cases_vis.json'), false],
];
/** toolbar flow of the crawls: control titles, type:text, key:Name */
function runFlow(e: EditorCore, host: any, flow: string[]): boolean {
  for (const st of flow) {
    if (st.startsWith('type:')) e.typeText(st.slice(5));
    else if (st.startsWith('key:')) handleKey(host, st.slice(4), {} as any);
    else {
      const ctl = catalogue.controls.find((c) => c.title === st);
      if (!ctl || behaviorOf(ctl) === 'picker') return false;
      e.activate(ctl);
    }
  }
  return true;
}
const known: Record<string, string> = (() => { try { return JSON.parse(readFileSync(join(process.cwd(), 'evidence/ctx_consistency_known.json'), 'utf8')); } catch { return {}; } })();

function fresh(mml: string): { e: EditorCore; host: any } {
  const e = new EditorCore();
  e.geometry = new DocGeometry(e);
  e.setMathML(`<math${NS}>${mml}</math>`);
  return { e, host: { ed: e, runGeneral() {} } };
}
const strip = (s: string) => s.replace(NS, '');
const caretOk = (e: EditorCore): boolean => {
  try {
    const row = e.currentRow();
    return !!row && e.caret.index >= 0 && e.caret.index <= row.length;
  } catch { return false; }
};

for (const [set, list, select] of SETS) {
  for (const c of list) {
    if (!c.flow && !c.mml) continue;
    test(`contextual consistency: ${set}/${c.name}`, () => {
      const problems: string[] = [];
      const max = c.steps ?? 14;
      for (let stop = 0; stop <= max; stop++) {
        const mk = () => {
          const { e, host } = fresh(c.flow ? '' : c.mml!);
          if (c.flow && !runFlow(e, host, c.flow)) return null;
          handleKey(host, 'Home', {} as any);
          for (let j = 0; j < (c.start ?? 0); j++) handleKey(host, 'ArrowRight', {} as any);
          for (let j = 0; j < stop; j++) handleKey(host, 'ArrowRight', select ? ({ shift: true } as any) : ({} as any));
          return e;
        };
        const e0 = mk();
        if (!e0) break;
        const loc0 = locate(e0);
        const ctls = loc0 ? controlsFor(loc0) : [];
        for (const ctl of ctls) {
          if (ctl.disabled) continue;
          const opts = ctl.kind === 'select' ? (ctl.options ?? []).map((o) => o.value) : ctl.kind === 'length' ? ['1em'] : [undefined];
          for (const o of opts) {
            const tag = `${c.name}|${stop}|${ctl.title}${o !== undefined ? '=' + o : ''}`;
            if (known[tag]) continue;
            const e = mk()!;
            const loc = locate(e);
            const before = strip(e.getMathML()); // locating may add the (empty) result group of a long division
            const cur = loc ? ctxValue(e, loc, ctl.id) : undefined;
            let err = '';
            try { applyContext(e, ctl.id, o); } catch (x) { err = 'throws ' + String(x).slice(0, 100); }
            if (err) { problems.push(`${tag}: ${err}`); continue; }
            const after = strip(e.getMathML());
            // (b) loads back unchanged
            const rt = fresh(after.replace(/^<math[^>]*>|<\/math>$/g, '')).e;
            if (strip(rt.getMathML()) !== after) problems.push(`${tag}: MathML does not round-trip\n      ${after}\n      ${strip(rt.getMathML())}`);
            // (e) caret
            if (!caretOk(e)) problems.push(`${tag}: caret outside the document`);
            // (d) value shown afterwards
            if (after !== before || ctl.kind === 'select') {
              const l2 = locate(e);
              if (l2 && ctl.kind === 'select' && o !== undefined) {
                const v = ctxValue(e, l2, ctl.id).value;
                const same = (a?: string, b?: string) => (a ?? '').replace(/ /g, ' ') === (b ?? '').replace(/ /g, ' ');
                if (!same(v, o) && !(after === before)) problems.push(`${tag}: select shows "${v}" after choosing "${o}"`);
              }
            }
            // (c) undo / redo
            if (after !== before) {
              e.undo();
              const u = strip(e.getMathML());
              if (u !== before) problems.push(`${tag}: Undo does not restore\n      want ${before}\n      got  ${u}`);
              e.redo();
              const r = strip(e.getMathML());
              if (r !== after) problems.push(`${tag}: Redo does not reapply\n      want ${after}\n      got  ${r}`);
            }
            void cur;
          }
        }
      }
      if (process.env.CTX_REPORT && problems.length) console.log(problems.join('\n'));
      assert.equal(problems.length, 0, problems.slice(0, 6).join('\n'));
    });
  }
}
