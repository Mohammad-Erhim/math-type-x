// Arabic names of single tokens, from the reference mathml2accessible service (lang=ar).
// -> tests/oracle/speech_ar_tokens.json   { "<tag>|<mathvariant>|<text>": "<arabic>" }
import fs from 'node:fs';
const lang = process.argv[2] || 'ar';
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const sym = JSON.parse(fs.readFileSync('src/data/symbols.json', 'utf8'));
const keys = new Set(Object.keys(sym));
const ascii = [];
for (let c = 0x20; c < 0x7f; c++) ascii.push(String.fromCharCode(c));
for (const ch of ascii) for (const t of ['mo', 'mi']) keys.add(`${t}||${ch}`);
for (const ch of '×÷±∓¯‥⋅ℜℑ∇   −') for (const t of ['mo', 'mi']) keys.add(`${t}||${ch}`);
const greek = 'αβγδεζηθικλμνξοπρςστυφχψω';
for (const g of greek) { keys.add(`mi||${g}`); keys.add(`mi||${g.toUpperCase()}`); }
for (const g of ['ϕ', 'ϑ', 'ϖ', 'ϱ', 'ϵ', 'ϐ']) keys.add(`mi||${g}`);
for (const mv of ['script', 'fraktur', 'double-struck', 'bold', 'italic', 'bold-italic', 'normal']) for (const ch of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') keys.add(`mi|${mv}|${ch}`);
for (const mv of ['bold', 'italic', 'bold-italic', 'normal']) for (const g of 'αβγδεζηθικλμνξοπρστυφχψωΓΔΘΛΞΠΣΥΦΨΩ') keys.add(`mi|${mv}|${g}`);
for (const ch of '0123456789') { keys.add(`mn||${ch}`); keys.add(`mo||${ch}`); }
for (const mv of ['bold', 'italic', 'double-struck']) keys.add(`mn|${mv}|7`);
keys.add('mn||7');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = fs.existsSync(`tests/oracle/speech_${lang}_tokens.json`) ? JSON.parse(fs.readFileSync(`tests/oracle/speech_${lang}_tokens.json`, 'utf8')) : {};
const todo = [...keys].filter((k) => !(k in out));
console.log('keys', keys.size, 'todo', todo.length);
const post = async (mml) => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch('https://www.wiris.net/demo/editor/mathml2accessible', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ mml, lang }) });
      return await r.text();
    } catch (e) { await new Promise((r) => setTimeout(r, 800)); }
  }
  return null;
};
const worker = async () => {
  while (todo.length) {
    const k = todo.pop();
    const [tag, mv0, text] = [k.split('|')[0], k.split('|')[1], k.split('|').slice(2).join('|')];
    const mv = mv0.replace(/^mathvariant="(.*)"$/, '$1');
    const attr = /="/.test(mv0) && !/^mathvariant=/.test(mv0) ? ` ${mv0}` : mv ? ` mathvariant="${mv}"` : '';
    const mml = `<math${NS}><${tag}${attr}>${esc(text)}</${tag}></math>`;
    const a = await post(mml);
    if (a !== null) out[k] = a;
  }
};
await Promise.all([worker(), worker(), worker(), worker()]);
fs.writeFileSync(`tests/oracle/speech_${lang}_tokens.json`, JSON.stringify(out));
console.log('done', Object.keys(out).length);
