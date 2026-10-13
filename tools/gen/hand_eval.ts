// Accuracy of the built-in recogniser on a stroke corpus: node .build/hand_eval.cjs [corpus.json]
import { readFileSync } from 'node:fs';
import { recognize } from '../../src/hand/recognize';
const f = process.argv[2] ?? 'tests/oracle/hand_corpus_in.json';
const corpus = JSON.parse(readFileSync(f, 'utf8')) as { name: string; mml: string; x: number[][]; y: number[][]; t?: number[][] }[];
const SAME: Record<string, string> = { l: '1', I: '1', '|': '1', o: '0', O: '0' };
const CASE = new Set('cCoOsSuUvVwWxXzZpP'.split(''));
const merge = (m: string) => { let o = m; for (;;) { const n = o.replace(/<mn>(\d+)<\/mn><mn>(\d+)<\/mn>/g, '<mn>$1$2</mn>'); if (n === o) return o; o = n; } };
const norm = (m: string) => m.replace(/ xmlns="[^"]*"/, '').replace(/<mn>(\d+)<\/mn><mo>\.<\/mo><mn>(\d+)<\/mn>/g, '<mn>$1.$2</mn>');
let ok = 0;
const bad: string[] = [];
const byKind: Record<string, [number, number]> = {};
for (const s of corpus) {
  const r = recognize({ x: s.x, y: s.y, t: process.env.NOTIME ? undefined : s.t });
  const eq = (m: string) => m.replace(/<m([ion])>([lIoO|])<\/m[ion]>/g, (_a, _b, c) => `<m>${SAME[c]}</m>`).replace(/<mn>([01])<\/mn>/g, '<m>$1</m>');
  const fold = (m: string) => m.replace(/<mi>([a-zA-Z])<\/mi>/g, (a, c) => (CASE.has(c) ? `<mi>${c.toLowerCase()}</mi>` : a));
  const want = fold(eq(norm(s.mml)));
  const got = fold(eq(norm(r.mathml)));
  const kind = s.name.replace(/#\d+$/, '').length === 1 ? (/\d/.test(s.name[0]) ? 'digit' : /[a-zA-Z]/.test(s.name[0]) ? 'letter' : 'symbol') : 'expr';
  byKind[kind] ??= [0, 0];
  byKind[kind][1]++;
  if (want === got) {
    ok++;
    byKind[kind][0]++;
  } else bad.push(`${s.name.padEnd(22)} ${want.slice(0, 70)}\n${' '.repeat(22)} ${got.slice(0, 90)}`);
}
console.log(`recognised ${ok}/${corpus.length}`, JSON.stringify(byKind));
if (process.env.SHOW) console.log(bad.slice(0, +process.env.SHOW).join('\n'));
