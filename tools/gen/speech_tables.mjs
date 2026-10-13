// Table attribute headers of a language: every valid combination of the attributes the service prints.
// -> tests/oracle/speech_<lang>_tables.json  { "<mask>": "<header with {0}…>" }   (mask over columnalign,columnspacing,rowspacing,rowalign,framespacing)
import fs from 'node:fs';
const lang = process.argv[2] || 'ar';
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const names = ['columnalign', 'columnspacing', 'rowspacing', 'rowalign', 'framespacing'];
const vals = ['left', '3px', '2px', 'top', '1em'];
const post = async (mml) => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch('https://www.wiris.net/demo/editor/mathml2accessible', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ mml, lang }) });
      return await r.text();
    } catch (e) { await new Promise((r) => setTimeout(r, 800)); }
  }
  return null;
};
const out = {};
for (let m = 1; m < 32; m++) {
  const has = names.map((_, i) => (m >> i) & 1);
  if (has[4] && m !== 16) continue;
  if (has[1] && has[3]) continue;
  const at = names.map((n, i) => (has[i] ? ` ${n}="${vals[i]}"` : '')).join('');
  const a = await post(`<math${NS}><mtable${at}><mtr><mtd><mi>Q</mi></mtd></mtr><mtr><mtd><mi>W</mi></mtd></mtr></mtable></math>`);
  if (!a || /^Error|DOCTYPE/.test(a)) { out[m] = null; continue; }
  // everything before the first row's content
  const idx = a.indexOf(' Q ');
  out[m] = a.slice(0, idx);
}
fs.writeFileSync(`tests/oracle/speech_${lang}_tables.json`, JSON.stringify(out, null, 1));
for (const [m, v] of Object.entries(out)) console.log(m.padStart(2), JSON.stringify(v));
