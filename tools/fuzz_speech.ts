// Differential fuzzing of mathml2accessible against the reference service.
// node tools/fuzz_speech.cjs (bundled by tools/fuzz_speech.sh)  → tests/oracle/speech_fuzz.json
import { EditorCore } from '../src/core/engine';
import { handleKey } from '../src/core/keys';
import { catalogue } from '../src/core/catalogue';
import { locate, controlsFor, applyContext } from '../src/core/context';
import { DocGeometry } from '../src/layout/geometry';
import { mathml2accessible } from '../src/convert/speech';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

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
const seed = Number(process.env.SEED ?? 1);
const N = Number(process.env.N ?? 200);
const steps = Number(process.env.STEPS ?? 14);
const out = process.env.OUT ?? 'tests/oracle/speech_fuzz.json';
const rand = rng(seed);
const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)];
const CHARS = Array.from('0123456789abcxyzABC+-=*/()[]{}<>|.,;:!%^_ αβπΩ∞×÷≤ابسصعكل٠١٢٣٤٥٦٧٨٩٪،؛؟٫');
const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Backspace', 'Enter'];
const controls = catalogue.controls.filter((c) => !c.special && c.A);
const docs = new Set<string>();
for (let s = 0; s < N * 3 && docs.size < N; s++) {
  const ed = new EditorCore();
  ed.geometry = new DocGeometry(ed);
  if (rand() < 0.3) ed.setRtl(true);
  const host = { ed, runGeneral() {} };
  const n = 2 + Math.floor(rand() * steps);
  for (let k = 0; k < n; k++) {
    const r = rand();
    try {
      if (r < 0.5) ed.typeChar(pick(CHARS));
      else if (r < 0.62) handleKey(host, pick(KEYS), { ctrl: false, alt: false, shift: false, meta: false });
      else if (r < 0.9) ed.activate(pick(controls));
      else {
        const loc = locate(ed);
        if (loc) {
          const cs = controlsFor(loc).filter((c) => !c.disabled);
          if (cs.length) {
            const c = pick(cs);
            applyContext(ed, c.id, c.options && c.options.length ? pick(c.options).value : c.kind === 'length' ? pick(['2px', '0.5em']) : undefined);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  docs.add(ed.getMathML());
}
const post = async (mml: string, lang: string): Promise<string> => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch('https://www.wiris.net/demo/editor/mathml2accessible', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ mml, lang }) });
      return await r.text();
    } catch {
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  return 'NETWORK';
};
const rec: Record<string, { en: string; ar: string }> = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
const todo = [...docs].filter((d) => !(d in rec));
const worker = async () => {
  while (todo.length) {
    const d = todo.pop()!;
    rec[d] = { en: await post(d, 'en'), ar: await post(d, 'ar') };
  }
};
await Promise.all([worker(), worker(), worker(), worker()]);
writeFileSync(out, JSON.stringify(rec));
let bad = 0;
const lines: string[] = [];
for (const [mml, v] of Object.entries(rec)) {
  if (v.en.includes('<!DOCTYPE') || v.en === 'NETWORK') continue;
  for (const lang of ['en', 'ar'] as const) {
    let got: string;
    try {
      got = mathml2accessible(mml, lang);
    } catch {
      got = 'Error converting from MathML to accessible text.';
    }
    if (got !== v[lang]) {
      bad++;
      lines.push(`[${lang}] ${mml.replace(' xmlns="http://www.w3.org/1998/Math/MathML"', '').slice(0, 260)}\n    want ${JSON.stringify(v[lang]).slice(0, 220)}\n    got  ${JSON.stringify(got).slice(0, 220)}`);
    }
  }
}
console.log(`docs ${Object.keys(rec).length}, mismatches ${bad}`);
console.log(lines.slice(0, Number(process.env.SHOW ?? 30)).join('\n'));
