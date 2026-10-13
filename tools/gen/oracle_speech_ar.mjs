// Record the reference mathml2accessible answers for lang=ar over every MathML input of the English corpora.
// usage: node tools/gen/oracle_speech_ar.mjs [lang]   -> tests/oracle/services_speech_<lang>.json
import fs from 'node:fs';
const lang = process.argv[2] || 'ar';
const files = ['services_catalogue', 'services_speech2', 'services_stack', 'services_latex'];
const inputs = new Set();
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(`tests/oracle/${f}.json`, 'utf8'));
  for (const [k, v] of Object.entries(d)) inputs.add(f === 'services_latex' ? v.mml : k);
}
const out = {};
const outFile = `tests/oracle/services_speech_${lang}.json`;
if (fs.existsSync(outFile)) Object.assign(out, JSON.parse(fs.readFileSync(outFile, 'utf8')));
const todo = [...inputs].filter((m) => m && !(m in out));
console.log('inputs', inputs.size, 'todo', todo.length);
const post = async (mml) => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch('https://www.wiris.net/demo/editor/mathml2accessible', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ mml, lang }) });
      return await r.text();
    } catch (e) { await new Promise((r) => setTimeout(r, 800)); }
  }
  return null;
};
let n = 0;
const worker = async () => {
  while (todo.length) {
    const m = todo.pop();
    const a = await post(m);
    if (a !== null) out[m] = a;
    if (++n % 200 === 0) { fs.writeFileSync(outFile, JSON.stringify(out)); console.log(n); }
  }
};
await Promise.all([worker(), worker(), worker(), worker()]);
fs.writeFileSync(outFile, JSON.stringify(out, null, 0));
console.log('done', Object.keys(out).length);
