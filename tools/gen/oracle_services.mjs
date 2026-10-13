// Record the reference conversion services' answers for MathML samples (black-box oracle).
import fs from 'node:fs';
const cat = JSON.parse(fs.readFileSync('src/data/catalogue.json', 'utf8'));
const set = new Set();
for (const c of cat.controls) for (const k of ['A', 'A2', 'B', 'C']) if (c[k] && c[k] !== '<math/>') set.add(c[k]);
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const list = [...set].map((s) => s.replace('<math', '<math' + NS));
const out = fs.existsSync('tests/oracle/services_catalogue.json') ? JSON.parse(fs.readFileSync('tests/oracle/services_catalogue.json', 'utf8')) : {};
const post = async (path, body) => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch('https://www.wiris.net/demo/editor/' + path, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
      return await r.text();
    } catch (e) { await new Promise((r) => setTimeout(r, 1000)); }
  }
  return null;
};
let n = 0;
for (const m of list) {
  if (out[m]) continue;
  const [acc, tex] = await Promise.all([post('mathml2accessible', { mml: m, lang: 'en' }), post('mathml2latex', { mml: m })]);
  out[m] = { acc, tex };
  if (++n % 50 === 0) { fs.writeFileSync('tests/oracle/services_catalogue.json', JSON.stringify(out)); console.log(n, list.length); }
  await new Promise((r) => setTimeout(r, 120));
}
fs.writeFileSync('tests/oracle/services_catalogue.json', JSON.stringify(out));
console.log('done', Object.keys(out).length);
