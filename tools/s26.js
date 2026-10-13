const { scenario } = require('./sc');
const M = require('./mml');
const words = ['sin','cos','tan','cot','sec','csc','arcsin','arccos','arctan','arccot','sinh','cosh','tanh','coth','sech','csch','log','ln','lg','exp','lim','liminf','limsup','max','min','sup','inf','det','dim','ker','gcd','lcm','mod','deg','arg','Re','Im','sgn','Pr','hom','tr','rank','cosec','asin','acos','atan','sen','tg','ctg','sinx','xsin','sin2','abc','Sin','SIN','pi','e','i','d','dx'];
scenario('s26_reserved_words', async (H) => {
  const { p } = H;
  const out = [];
  for (const w of words) {
    let res = '';
    await H.step(`Type "${w}"`, async () => { await H.reset(); await H.focusEdit(); await p.keyboard.type(w); res = await H.mml(); }, { clip: 'edit', noMathml: true, extra: async () => ({ mathml: res }) });
  }
}, {});
