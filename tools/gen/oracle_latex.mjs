import fs from 'node:fs';
const corpus = JSON.parse(fs.readFileSync('tests/oracle/latex_corpus.json', 'utf8'));
const out = {};
const post = async (path, body) => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch('https://www.wiris.net/demo/editor/' + path, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
      return await r.text();
    } catch (e) { await new Promise((r) => setTimeout(r, 1000)); }
  }
  return null;
};
for (const l of corpus) {
  const mml = await post('latex2mathml', { latex: l, pasteformat: 'auto' });
  const back = mml ? await post('mathml2latex', { mml }) : null;
  const acc = mml ? await post('mathml2accessible', { mml, lang: 'en' }) : null;
  out[l] = { mml, back, acc };
  await new Promise((r) => setTimeout(r, 100));
}
fs.writeFileSync('tests/oracle/services_latex.json', JSON.stringify(out, null, 1));
console.log('done', Object.keys(out).length);
