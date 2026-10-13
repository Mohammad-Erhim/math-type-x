// Which operators make a following "-" read as "negative" (instead of "minus")?  -> src/data/speech/signs.json
import fs from 'node:fs';
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const sym = JSON.parse(fs.readFileSync('src/data/symbols.json', 'utf8'));
const chars = new Set();
for (const k of Object.keys(sym)) { const [t, , x] = k.split('|'); if (t === 'mo' && [...x].length === 1) chars.add(x); }
for (let c = 0x21; c < 0x7f; c++) chars.add(String.fromCharCode(c));
for (const c of '،؛؟٪٫٬°′″∞…⋯∀∃∇∂¬∧∨∩∪∈∉⊂⊃→⇒⇔≡≈≠≤≥×÷±∓⋅∘∗√∫∑∏') chars.add(c);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const post = async (mml) => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch('https://www.wiris.net/demo/editor/mathml2accessible', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ mml, lang: 'en' }) });
      return await r.text();
    } catch (e) { await new Promise((r) => setTimeout(r, 800)); }
  }
  return null;
};
const sign = process.argv[2] === 'mp' ? '\u2213' : '-';
const negWord = sign === '-' ? 'negative' : 'negative-or-plus';
const minusWord = sign === '-' ? 'minus' : 'minus-or-plus';
const neg = [], minus = [], other = {};
const list = [...chars];
const worker = async () => {
  while (list.length) {
    const c = list.pop();
    // "x C - y": after the operator, is the minus a sign?
    const a = await post(`<math${NS}><mi>x</mi><mo>${esc(c)}</mo><mo>${sign}</mo><mi>y</mi></math>`);
    if (a === null) continue;
    if (a.endsWith(` ${negWord} y`)) neg.push(c);
    else if (a.endsWith(` ${minusWord} y`)) minus.push(c);
    else other[c] = a.slice(0, 80);
  }
};
await Promise.all([worker(), worker(), worker(), worker()]);
fs.mkdirSync('src/data/speech', { recursive: true });
if (sign === '-') fs.writeFileSync('src/data/speech/signs.json', JSON.stringify({ negativeAfter: neg.sort(), minusAfter: minus.sort() }));
else fs.writeFileSync('tests/oracle/speech_signs_mp.json', JSON.stringify({ negativeAfter: neg.sort(), minusAfter: minus.sort() }));
console.log('negative after', neg.length, 'minus after', minus.length, 'other', JSON.stringify(other));
console.log(JSON.stringify(minus.sort()));
