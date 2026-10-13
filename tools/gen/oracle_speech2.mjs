import fs from 'node:fs';
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const M = (s) => `<math${NS}>${s}</math>`;
const mi = (c) => `<mi>${c}</mi>`, mn = (c) => `<mn>${c}</mn>`, mo = (c) => `<mo>${c}</mo>`;
const cases = [
  `<mroot>${mi('x')}${mn(4)}</mroot>`, `<mroot>${mi('x')}${mn(5)}</mroot>`, `<mroot>${mi('x')}${mn(10)}</mroot>`, `<mroot>${mi('x')}${mn(2)}</mroot>`, `<mroot>${mi('x')}${mn(1)}</mroot>`,
  `<mroot>${mi('x')}${mi('n')}</mroot>`, `<mroot>${mi('x')}${mi('k')}</mroot>`, `<mroot><mrow>${mi('x')}${mo('+')}${mn(1)}</mrow>${mn(3)}</mroot>`, `<mroot>${mi('x')}<mrow>${mi('n')}${mo('+')}${mn(1)}</mrow></mroot>`,
  `<mfrac>${mn(1)}${mn(3)}</mfrac>`, `<mfrac>${mn(3)}${mn(4)}</mfrac>`, `<mfrac>${mn(1)}${mn(4)}</mfrac>`, `<mfrac>${mn(2)}${mn(3)}</mfrac>`, `<mfrac>${mn(1)}${mn(5)}</mfrac>`, `<mfrac>${mn(5)}${mn(2)}</mfrac>`, `<mfrac>${mn(1)}${mn(10)}</mfrac>`, `<mfrac>${mi('a')}${mi('b')}</mfrac>`,
  `<mfrac>${mn(1)}<mrow>${mi('x')}${mo('+')}${mn(1)}</mrow></mfrac>`, `<mfrac><mrow>${mi('x')}${mo('+')}${mn(1)}</mrow>${mn(2)}</mfrac>`, `<mfrac>${mn(1)}${mi('x')}</mfrac>`,
  `<mfrac><mfrac>${mi('a')}${mi('b')}</mfrac>${mi('c')}</mfrac>`, `<mfrac>${mi('a')}<mfrac>${mi('b')}${mi('c')}</mfrac></mfrac>`, `<mfrac><msup>${mi('x')}${mn(2)}</msup>${mn(2)}</mfrac>`,
  `<msup>${mi('x')}${mn(2)}</msup>`, `<msup>${mi('x')}${mn(3)}</msup>`, `<msup>${mi('x')}${mn(4)}</msup>`, `<msup>${mi('x')}${mn(10)}</msup>`, `<msup>${mi('x')}${mi('n')}</msup>`,
  `<msup>${mi('x')}<mrow>${mo('-')}${mn(1)}</mrow></msup>`, `<msup>${mi('e')}<mrow>${mi('x')}${mo('+')}${mn(1)}</mrow></msup>`, `<msup>${mi('x')}<msup>${mn(2)}${mn(3)}</msup></msup>`, `<msup><mfenced>${mi('a')}</mfenced>${mn(2)}</msup>`,
  `<msub>${mi('x')}${mn(1)}</msub>`, `<msub>${mi('x')}${mi('i')}</msub>`, `<msub>${mi('a')}<mrow>${mi('i')}${mi('j')}</mrow></msub>`, `<msub>${mi('x')}<mrow>${mi('i')}${mo('+')}${mn(1)}</mrow></msub>`,
  `<msubsup>${mi('x')}${mn(1)}${mn(2)}</msubsup>`, `<msubsup>${mi('a')}${mi('i')}${mi('n')}</msubsup>`, `<msubsup>${mi('x')}<mrow>${mi('i')}${mo('+')}${mn(1)}</mrow>${mn(2)}</msubsup>`,
  `<msqrt>${mi('x')}</msqrt>`, `<msqrt><mrow>${mi('x')}${mo('+')}${mn(1)}</mrow></msqrt>`, `<msqrt><msup>${mi('x')}${mn(2)}</msup></msqrt>`, `<msqrt><mfrac>${mi('a')}${mi('b')}</mfrac></msqrt>`, `<msqrt><mi>x</mi><mi>y</mi></msqrt>`,
  `<munderover><mo>&#x2211;</mo><mrow>${mi('i')}${mo('=')}${mn(1)}</mrow>${mi('n')}</munderover>`, `<munderover><mo>&#x220F;</mo><mrow>${mi('k')}${mo('=')}${mn(0)}</mrow>${mi('n')}</munderover>`, `<munder><mo>&#x2211;</mo>${mi('i')}</munder>`, `<munder><mi>lim</mi><mrow>${mi('x')}${mo('&#x2192;')}${mn(0)}</mrow></munder>`,
  `<msubsup><mo>&#x222B;</mo>${mn(0)}${mn(1)}</msubsup>`, `<msubsup><mo>&#x222B;</mo>${mi('a')}${mi('b')}</msubsup>`, `<msub><mo>&#x222B;</mo>${mi('C')}</msub>`, `<mo>&#x222B;</mo>`, `<mo>&#x222C;</mo>`, `<mo>&#x222E;</mo>`,
  `<mover>${mi('x')}<mo>&#x2C6;</mo></mover>`, `<mover>${mi('x')}<mo>&#xAF;</mo></mover>`, `<mover>${mi('x')}<mo>&#x2192;</mo></mover>`, `<mover>${mi('x')}<mo>&#x2DC;</mo></mover>`, `<mover>${mi('x')}<mo>&#x2D9;</mo></mover>`, `<mover>${mi('x')}<mo>&#xA8;</mo></mover>`,
  `<mover><mrow>${mi('a')}${mo('+')}${mi('b')}</mrow><mo>&#xAF;</mo></mover>`, `<mover><mrow>${mi('a')}${mi('b')}</mrow><mo>&#x2192;</mo></mover>`, `<munder>${mi('x')}<mo>_</mo></munder>`, `<munder><mrow>${mi('a')}${mo('+')}${mi('b')}</mrow><mo>&#x23DF;</mo></munder>`, `<mover><mrow>${mi('a')}${mo('+')}${mi('b')}</mrow><mo>&#x23DE;</mo></mover>`,
  `<mfenced open="[" close=")">${mi('a')}${mi('b')}</mfenced>`, `<mfenced><mrow>${mi('a')}${mo(',')}${mi('b')}</mrow></mfenced>`, `<mfenced open="{" close="}"><mrow>${mi('a')}${mo('+')}${mi('b')}</mrow></mfenced>`, `<mfenced separators=","><mi>a</mi><mi>b</mi><mi>c</mi></mfenced>`, `<mfenced separators=";"><mi>a</mi><mi>b</mi></mfenced>`, `<mfenced separators="."><mi>a</mi><mi>b</mi></mfenced>`, `<mfenced separators=":"><mi>a</mi><mi>b</mi></mfenced>`, `<mfenced separators=" "><mi>a</mi><mi>b</mi></mfenced>`,
  `<mtable><mtr><mtd>${mn(1)}</mtd><mtd>${mn(2)}</mtd></mtr><mtr><mtd>${mn(3)}</mtd><mtd>${mn(4)}</mtd></mtr></mtable>`, `<mfenced><mtable><mtr><mtd>${mi('a')}</mtd><mtd>${mi('b')}</mtd></mtr><mtr><mtd>${mi('c')}</mtd><mtd>${mi('d')}</mtd></mtr></mtable></mfenced>`,
  `<mtable><mtr><mtd>${mi('a')}${mo('+')}${mi('b')}</mtd><mtd>${mi('c')}</mtd></mtr></mtable>`, `<mtable frame="solid"><mtr><mtd>${mi('a')}</mtd></mtr></mtable>`, `<mtable rowlines="none solid none"><mtr><mtd>${mi('a')}</mtd></mtr><mtr><mtd>${mi('b')}</mtd></mtr></mtable>`, `<mtable align="top"><mtr><mtd>${mi('a')}</mtd></mtr></mtable>`, `<mtable equalrows="true"><mtr><mtd>${mi('a')}</mtd></mtr></mtable>`,
  `<mtext>hello</mtext>`, `<mtext>hello&#xA0;world</mtext>`, `<mtext>a</mtext><mi>x</mi>`, `<mi mathvariant="bold">x</mi>`, `<mi mathvariant="bold-italic">x</mi>`, `<mn mathvariant="bold">12</mn>`, `<mn mathvariant="italic">12</mn>`, `<mo mathvariant="bold">+</mo>`, `<mi mathvariant="italic">x</mi>`, `<mi mathcolor="#FF0000">x</mi>`,
  `<mn>3.14</mn>`, `<mn>1,000</mn>`, `<mn>1</mn><mo>,</mo><mn>000</mn>`, `<mn>3</mn><mo>.</mo><mn>14</mn>`, `<mn>12345</mn>`, `<mn>1</mn><mo>.</mo>`, `<mo>.</mo><mn>5</mn>`,
  `<mi>sin</mi><mi>x</mi>`, `<mi>log</mi><mn>2</mn>`, `<mi>ln</mi><mi>x</mi>`, `<mi>lim</mi>`, `<mi>sin</mi><mo>(</mo><mi>x</mi><mo>)</mo>`,
  `<mi>a</mi><mo>=</mo><mi>b</mi>`, `<mi>a</mi><mo>&#x2260;</mo><mi>b</mi>`, `<mi>a</mi><mo>&#x2264;</mo><mi>b</mi>`, `<mi>a</mi><mo>&#x2265;</mo><mi>b</mi>`, `<mi>a</mi><mo>&#xB1;</mo><mi>b</mi>`, `<mi>a</mi><mo>&#xD7;</mo><mi>b</mi>`, `<mi>a</mi><mo>&#xF7;</mo><mi>b</mi>`, `<mi>a</mi><mo>/</mo><mi>b</mi>`, `<mi>a</mi><mo>&#x22C5;</mo><mi>b</mi>`, `<mi>a</mi><mo>*</mo><mi>b</mi>`,
  `<mo>-</mo><mi>x</mi>`, `<mi>a</mi><mo>-</mo><mi>b</mi>`, `<mi>a</mi><mo>+</mo><mo>-</mo><mi>b</mi>`, `<mo>-</mo><mn>1</mn>`, `<mo>+</mo><mn>1</mn>`, `<mfrac><mrow><mo>-</mo>${mi('b')}</mrow>${mn(2)}</mfrac>`, `<mfenced><mrow><mo>-</mo>${mn(1)}</mrow></mfenced>`, `<mi>x</mi><mo>=</mo><mo>-</mo><mn>2</mn>`,
  `<mi>&#x3B1;</mi><mi>&#x3B2;</mi><mi>&#x3B3;</mi><mi>&#x3B8;</mi><mi>&#x3C6;</mi><mi>&#x3D5;</mi><mi>&#x3C9;</mi>`, `<mi>&#x393;</mi><mi>&#x394;</mi><mi>&#x3A9;</mi><mi>&#x3A3;</mi>`,
  `<mspace linebreak="newline"/>`, `<mi>a</mi><mspace linebreak="newline"/><mi>b</mi>`, `<mspace width="1em"/>`, `<mspace width="2px"/>`, `<mspace height="3ex"/>`, `<mspace width="1ex" height="1ex" depth="1ex"/>`,
  `<mpadded lspace="+1px"><mi>x</mi></mpadded>`, `<mpadded voffset="-1px"><mi>x</mi></mpadded>`,
  `<mmultiscripts>${mi('x')}${mn(1)}${mn(2)}</mmultiscripts>`, `<mmultiscripts>${mi('x')}<mprescripts/>${mn(1)}${mn(2)}</mmultiscripts>`, `<mmultiscripts>${mi('x')}${mn(1)}<none/><mprescripts/><none/>${mn(2)}</mmultiscripts>`,
  `<menclose notation="box">${mi('a')}${mo('+')}${mi('b')}</menclose>`, `<menclose notation="circle">${mi('a')}</menclose>`, `<menclose notation="updiagonalstrike">${mi('a')}${mi('b')}</menclose>`,
  `<mstyle mathsize="24px">${mi('x')}</mstyle>`, `<mstyle displaystyle="true">${mi('x')}</mstyle>`,
  `<mfrac><mn>1</mn><mn>2</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>3</mn></mfrac>`, `${mi('x')}${mo('+')}<mfrac><mn>1</mn><mn>2</mn></mfrac>`, `<mn>2</mn><mfrac><mn>1</mn><mn>2</mn></mfrac>`,
];
const out = {};
const post = async (body) => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch('https://www.wiris.net/demo/editor/mathml2accessible', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
      return await r.text();
    } catch (e) { await new Promise((r) => setTimeout(r, 800)); }
  }
  return null;
};
for (const c of cases) {
  const m = M(c);
  out[m] = { acc: await post({ mml: m, lang: 'en' }) };
  await new Promise((r) => setTimeout(r, 80));
}
fs.writeFileSync('tests/oracle/services_speech2.json', JSON.stringify(out, null, 1));
console.log('done', Object.keys(out).length);
