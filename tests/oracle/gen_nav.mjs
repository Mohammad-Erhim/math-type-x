// Systematic navigation probes: traversal order, vertical movement, delete behaviours for each structure.
import fs from 'node:fs';
const P = {};
const L = (c) => `<mi>${c}</mi>`;
const D = {
  frac: `<mfrac>${L('a')}${L('b')}</mfrac>`,
  sqrt: `<msqrt>${L('a')}</msqrt>`,
  root: `<mroot>${L('a')}${L('b')}</mroot>`,
  sup: `<msup>${L('a')}${L('b')}</msup>`,
  sub: `<msub>${L('a')}${L('b')}</msub>`,
  subsup: `<msubsup>${L('a')}${L('b')}${L('c')}</msubsup>`,
  multi: `<mmultiscripts>${L('a')}${L('b')}${L('c')}<mprescripts/>${L('d')}${L('e')}</mmultiscripts>`,
  over: `<mover>${L('a')}${L('b')}</mover>`,
  under: `<munder>${L('a')}${L('b')}</munder>`,
  underover: `<munderover>${L('a')}${L('b')}${L('c')}</munderover>`,
  fence: `<mfenced>${L('a')}</mfenced>`,
  fence2: `<mfenced separators=",">${L('a')}${L('b')}</mfenced>`,
  table: `<mtable><mtr><mtd>${L('a')}</mtd><mtd>${L('b')}</mtd></mtr><mtr><mtd>${L('c')}</mtd><mtd>${L('d')}</mtd></mtr></mtable>`,
  fencedtable: `<mfenced><mtable><mtr><mtd>${L('a')}</mtd><mtd>${L('b')}</mtd></mtr><mtr><mtd>${L('c')}</mtd><mtd>${L('d')}</mtd></mtr></mtable></mfenced>`,
  enclose: `<menclose notation="box">${L('a')}</menclose>`,
  nested: `<mfrac><mfrac>${L('a')}${L('b')}</mfrac>${L('c')}</mfrac>`,
  longdiv: `<mlongdiv charalign="center" charspacing="0px" stackalign="left">${L('a')}${L('b')}<msgroup><msrow>${L('c')}</msrow></msgroup></mlongdiv>`,
  stack: `<mstack charalign="center" stackalign="right"><msrow>${L('a')}</msrow><msrow>${L('b')}</msrow><msline/><msrow>${L('c')}</msrow></mstack>`,
  padded: `<mpadded lspace="+1px">${L('a')}</mpadded>`,
  bigop: `<munderover><mo>&#x2211;</mo>${L('a')}${L('b')}</munderover>`,
  subf: `<msub><mfrac>${L('a')}${L('b')}</mfrac>${L('c')}</msub>`,
};
const wrap = (d) => `<math>${L('x')}${d}${L('y')}</math>`;
const Zread = [{ type: 'Z' }, { mml: 1 }, { press: 'Control+z' }];
for (const [k, d] of Object.entries(D)) {
  const set = { set: wrap(d) };
  const R = [set], Lf = [set], V = [set];
  for (let n = 0; n <= 9; n++) {
    R.push({ press: 'Home' }, ...(n ? [{ press: 'ArrowRight', n }] : []), ...Zread);
    Lf.push({ press: 'End' }, ...(n ? [{ press: 'ArrowLeft', n }] : []), ...Zread);
  }
  for (let n = 1; n <= 9; n++) {
    V.push({ press: 'Home' }, { press: 'ArrowRight', n }, { press: 'ArrowUp' }, ...Zread);
    V.push({ press: 'Home' }, { press: 'ArrowRight', n }, { press: 'ArrowDown' }, ...Zread);
  }
  P['trav_R_' + k] = R;
  P['trav_L_' + k] = Lf;
  P['vert_' + k] = V;
}
// Home/End from inside structures
for (const k of ['frac', 'sqrt', 'sup', 'table', 'fencedtable']) {
  const set = { set: `<math>${L('x')}${D[k]}${L('y')}<mspace linebreak="newline"/>${L('p')}${L('q')}</math>` };
  const seq = [set, { press: 'Home' }, { press: 'ArrowRight', n: 3 }];
  P['homeend_' + k] = [...seq, { press: 'End' }, ...Zread, ...seq.slice(1), { press: 'Home' }, ...Zread, ...seq.slice(1), { press: 'Shift+End' }, { type: 'Z' }, { mml: 1 }, { press: 'Control+z' }];
}
fs.writeFileSync(new URL('./programs_nav.json', import.meta.url), JSON.stringify(P, null, 1));
console.log(Object.keys(P).length);
