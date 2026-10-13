import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorCore } from '../src/core/engine';
import { handleKey } from '../src/core/keys';
import { catalogue } from '../src/core/catalogue';
import { locate, controlsFor, applyContext } from '../src/core/context';
import { parseMathML, serializeMathML } from '../src/core/mathml';
import { layoutDocument, pathKey } from '../src/layout/layout';
import { DocGeometry } from '../src/layout/geometry';
import { mathml2accessible, AccessibleError } from '../src/convert/speech';
import { rowAt, tryRowAt } from '../src/core/model';

/** deterministic generator (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const DOCS = [
  '<math/>',
  `<math ${NS}><mi>x</mi><mo>+</mo><mn>12</mn></math>`,
  `<math ${NS}><mfrac><mi>a</mi><mi>b</mi></mfrac><mo>=</mo><msqrt><mn>2</mn></msqrt></math>`,
  `<math ${NS}><mstack charalign="center" stackalign="right"><mn>123</mn><msrow><mo>+</mo><mn>45</mn></msrow><msline/><mn>168</mn></mstack></math>`,
  `<math ${NS}><mstack stackalign="right"><mscarries location="n"><mn>1</mn></mscarries><mn>12</mn><mn>34</mn><msline/><msrow/></mstack></math>`,
  `<math ${NS}><mlongdiv charalign="center" charspacing="0px" stackalign="left"><mn>3</mn><mn>12</mn><msgroup><msrow><mn>36</mn></msrow><msrow><mn>0</mn></msrow></msgroup></mlongdiv></math>`,
  `<math ${NS}><mlongdiv longdivstyle="shortstackedrightright" charalign="center" charspacing="0px" stackalign="left"><mrow/><mrow/><msgroup><msrow/></msgroup></mlongdiv></math>`,
  `<math ${NS}><mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced></math>`,
  `<math ${NS}><munderover><mo>&#x2211;</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover><msup><mi>i</mi><mn>2</mn></msup><mspace linebreak="newline"/><mi>y</mi></math>`,
  `<math ${NS}><msubsup><mo>&#x222B;</mo><mn>0</mn><mn>1</mn></msubsup><mi>x</mi><mi>dx</mi></math>`,
];
const CHARS = '0123456789abcxyzABC+-=*/()[]{}<>|.,;:!%^_ \'"~&@#$απ∞×÷≤ا';
const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Backspace', 'Delete', 'Enter', 'Tab', 'Escape'];

function checkInvariants(ed: EditorCore, where: string): void {
  // 1. the caret addresses a real row and a real index
  const row = tryRowAt(ed.row, ed.caret.path);
  assert.ok(row, `${where}: caret path invalid ${JSON.stringify(ed.caret)}`);
  assert.ok(ed.caret.index >= 0 && ed.caret.index <= row!.length, `${where}: caret index ${ed.caret.index} of ${row!.length}`);
  // 2. the MathML is well formed and stable under a second round trip
  const mml = ed.getMathML();
  const doc = parseMathML(mml);
  const again = serializeMathML(doc.row, doc.attrs, { xmlns: true });
  const doc2 = parseMathML(again);
  assert.equal(serializeMathML(doc2.row, doc2.attrs, { xmlns: true }), again, `${where}: serialisation not stable`);
  // 3. the layout works and knows the row of the caret
  const lay = layoutDocument(ed.row);
  assert.ok(Number.isFinite(lay.w) && Number.isFinite(lay.a) && Number.isFinite(lay.d), `${where}: layout size`);
  assert.ok(lay.rows.get(pathKey(ed.caret.path)), `${where}: no layout row for the caret ${pathKey(ed.caret.path)}`);
  for (const it of lay.items) {
    const o = it as unknown as Record<string, number>;
    assert.ok(Number.isFinite(o.x) && Number.isFinite(o.y), `${where}: item position`);
  }
  // 4. the selection (if any) points into a real row
  if (ed.sel) {
    const sr = tryRowAt(ed.row, ed.sel.path);
    assert.ok(sr && ed.sel.from >= 0 && ed.sel.to <= sr.length, `${where}: selection invalid`);
  }
  // 5. speech and contextual controls do not fail
  try {
    mathml2accessible(mml);
  } catch (e) {
    // the service refuses some formulas (stacks without alignment, empty big operators …) like the reference
    assert.ok(e instanceof AccessibleError, `${where}: speech failed with ${(e as Error).message}`);
  }
  const loc = locate(ed);
  if (loc) controlsFor(loc);
}

test('random editing sessions keep the document, caret and layout consistent', () => {
  const rand = rng(Number(process.env.FUZZ_SEED ?? 12345));
  const sessions = Number(process.env.FUZZ_SESSIONS ?? 160);
  const steps = Number(process.env.FUZZ_STEPS ?? 40);
  const controls = catalogue.controls.filter((c) => !c.special && c.A);
  const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)];
  let ops = 0;
  for (let s = 0; s < sessions; s++) {
    const ed = new EditorCore();
    ed.geometry = new DocGeometry(ed);
    const doc = pick(DOCS);
    ed.setMathML(doc);
    const log: string[] = [`doc ${doc.slice(0, 60)}`];
    const host = { ed, runGeneral() {} };
    for (let k = 0; k < steps; k++) {
      const r = rand();
      let label = "";
      try {
        if (r < 0.3) {
          const ch = pick(Array.from(CHARS));
          label = `type ${JSON.stringify(ch)}`;
          log.push(label);
          ed.typeChar(ch);
        } else if (r < 0.55) {
          const key = pick(KEYS);
          const shift = rand() < 0.25;
          label = `key ${shift ? 'Shift+' : ''}${key}`;
          log.push(label);
          handleKey(host, key, { ctrl: false, alt: false, shift, meta: false });
        } else if (r < 0.75) {
          const c = pick(controls);
          label = `control ${c.title}`;
          log.push(label);
          ed.activate(c);
        } else if (r < 0.85) {
          const loc = locate(ed);
          if (loc) {
            const cs = controlsFor(loc).filter((c) => !c.disabled);
            if (cs.length) {
              const c = pick(cs);
              label = `context ${c.id}`;
              log.push(label);
              const val = c.options && c.options.length ? pick(c.options).value : c.kind === 'length' ? pick(['2px', '0.5em', '-1px', '5']) : undefined;
              applyContext(ed, c.id, val);
            }
          }
        } else if (r < 0.92) {
          label = 'undo/redo';
          log.push(label);
          if (rand() < 0.5) ed.undo();
          else ed.redo();
        } else if (r < 0.96) {
          const m = pick(['bold', 'italic', 'text', 'auto'] as const);
          label = `mode ${m}`;
          log.push(label);
          if (m === 'bold') ed.toggleBold();
          else if (m === 'italic') ed.toggleItalic();
          else if (m === 'text') ed.setRegularText(!ed.modes.text);
          else ed.setAutoItalic(!ed.modes.autoItalic);
        } else {
          label = 'selectAll';
          log.push(label);
          ed.selectAll();
        }
        checkInvariants(ed, `session ${s} step ${k} (${label})`);
        ops++;
      } catch (e) {
        throw new Error(`session ${s} step ${k}: ${(e as Error).message}\n  after: ${log.slice(-12).join(' | ')}\n  doc: ${ed.getMathML().slice(0, 300)}`);
      }
    }
  }
  console.log(`fuzz: ${ops} operations in ${sessions} sessions`);
});
