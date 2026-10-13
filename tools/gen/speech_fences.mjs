// Spoken words of opening / closing fence characters and of mfenced separators in a language.
// -> tests/oracle/speech_<lang>_fences.json  { open: {ch: phrase}, close: {ch: phrase}, sep: {ch: word} }
import fs from 'node:fs';
const lang = process.argv[2] || 'ar';
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const chars = ['(', ')', '[', ']', '{', '}', '|', '||', '<', '>', '⌈', '⌉', '⌊', '⌋', '⟨', '⟩', '〈', '〉', '⟦', '⟧', '‖', '/', '\\', '〈', '〉', '∥', 'a', '#'];
const seps = [',', '.', ';', ':', ' ', '|', '-', '+', '*', '/', '=', '&', '•'];
const post = async (mml) => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch('https://www.wiris.net/demo/editor/mathml2accessible', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ mml, lang }) });
      return await r.text();
    } catch (e) { await new Promise((r) => setTimeout(r, 800)); }
  }
  return null;
};
const out = { open: {}, close: {}, sep: {}, enclose: {}, encloseEnd: {} };
const M = (b) => `<math${NS}>${b}</math>`;
for (const c of chars) {
  const o = await post(M(`<mfenced open="${esc(c)}" close=""><mi>Q</mi></mfenced>`));
  const cl = await post(M(`<mfenced open="" close="${esc(c)}"><mi>Q</mi></mfenced>`));
  // 'open X Q close'  /  'open Q close X'
  const mo = /^(.*) Q (?:[^ ]+)$/s.exec(o ?? '');
  const mc = /^(?:[^ ]+) Q (.*)$/s.exec(cl ?? '');
  if (mo && !/^Error/.test(o)) out.open[c] = mo[1];
  if (mc && !/^Error/.test(cl)) out.close[c] = mc[1];
}
for (const s of seps) {
  const a = await post(M(`<mfenced open="(" close=")" separators="${esc(s)}"><mi>Q</mi><mi>W</mi></mfenced>`));
  const m = /^.* Q ?(.*?) ?W .*$/s.exec(a ?? '');
  if (m && !/^Error/.test(a)) out.sep[s] = m[1];
  else out.sep[s] = null;
}
const notations = ['longdiv', 'actuarial', 'box', 'roundedbox', 'circle', 'left', 'right', 'top', 'bottom', 'updiagonalstrike', 'downdiagonalstrike', 'verticalstrike', 'horizontalstrike', 'madruwb', 'radical', 'phasorangle', 'updiagonalstrike downdiagonalstrike', 'downdiagonalstrike updiagonalstrike', 'verticalstrike horizontalstrike', 'horizontalstrike verticalstrike', 'box circle', 'left right', 'foo', 'foostrike', 'box updiagonalstrike'];
for (const nt of notations) {
  const a = await post(M(`<menclose notation="${nt}"><mi>Q</mi></menclose>`));
  const m = /^(.*) Q$/s.exec(a ?? '');
  out.enclose[nt] = m && !/^Error/.test(a) ? m[1] : null;
  const b = await post(M(`<menclose notation="${nt}"><mi>Q</mi><mi>W</mi></menclose>`));
  const mb = /^.* Q.? W (.*)$/s.exec(b ?? '');
  out.encloseEnd[nt] = mb && !/^Error/.test(b) ? mb[1] : null;
}
fs.writeFileSync(`tests/oracle/speech_${lang}_fences.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
