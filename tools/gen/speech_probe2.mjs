import fs from 'node:fs';
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const cases = JSON.parse(process.argv[2] ?? '[]');
const post = async (mml, lang) => {
  const r = await fetch('https://www.wiris.net/demo/editor/mathml2accessible', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ mml: `<math${NS}>${mml}</math>`, lang }) });
  return (await r.text()).replace(/‏/g, '<R>').slice(0, 160);
};
for (const c of cases) console.log(c.padEnd(90), '=>', await post(c, process.argv[3] || 'en'));
