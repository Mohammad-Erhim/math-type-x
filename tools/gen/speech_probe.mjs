// Template probes: structures with marker operands Q W Z, answered by the reference in en and ar.
// -> tests/oracle/speech_templates.json   { name: { mml, en, ar } }
import fs from 'node:fs';
const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const M = (b) => `<math${NS}>${b}</math>`;
const i = (c) => `<mi>${c}</mi>`;
const n = (c) => `<mn>${c}</mn>`;
const o = (c) => `<mo>${c}</mo>`;
const Q = i('Q'), W = i('W'), Z = i('Z');
const QW = `<mrow>${Q}${o('+')}${W}</mrow>`;
const WZ = `<mrow>${W}${o('+')}${Z}</mrow>`;
const P = {};
const add = (k, b) => { P[k] = M(b); };
// fractions
add('frac', `<mfrac>${Q}${W}</mfrac>`);
add('frac_bev', `<mfrac bevelled="true">${Q}${W}</mfrac>`);
add('frac_cnum', `<mfrac>${QW}${Z}</mfrac>`);
add('frac_cden', `<mfrac>${Z}${QW}</mfrac>`);
add('frac_cboth', `<mfrac>${QW}${WZ}</mfrac>`);
add('frac_bev_c', `<mfrac bevelled="true">${QW}${Z}</mfrac>`);
for (const d of [2, 3, 4, 5, 6]) add(`frac_1_${d}`, `<mfrac>${n(1)}${n(d)}</mfrac>`);
add('frac_blank_num', `<mfrac><mrow/>${Z}</mfrac>`);
add('frac_blank_den', `<mfrac>${Z}<mrow/></mfrac>`);
add('frac_blank_both', `<mfrac><mrow/><mrow/></mfrac>`);
add('frac_bev_1_2', `<mfrac bevelled="true">${n(1)}${n(2)}</mfrac>`);
// roots
add('sqrt_empty', `<msqrt><mrow/></msqrt>`);
add('sqrt', `<msqrt>${Q}</msqrt>`);
add('sqrt_c', `<msqrt>${QW}</msqrt>`);
add('sqrt_frac', `<msqrt><mfrac>${Q}${W}</mfrac></msqrt>`);
for (const d of [2, 3, 4, 5, 6, 10]) add(`root_${d}`, `<mroot>${Q}${n(d)}</mroot>`);
add('root_c_3', `<mroot>${QW}${n(3)}</mroot>`);
add('root_n', `<mroot>${Q}${i('n')}</mroot>`);
add('root_k', `<mroot>${Q}${i('k')}</mroot>`);
add('root_n_c', `<mroot>${QW}${i('n')}</mroot>`);
add('root_W', `<mroot>${Q}${W}</mroot>`);
add('root_idx_c', `<mroot>${Q}${WZ}</mroot>`);
add('root_idx_c_rad_c', `<mroot>${QW}${WZ}</mroot>`);
add('root_blank', `<mroot><mrow/><mrow/></mroot>`);
// scripts
add('sup', `<msup>${Q}${W}</msup>`);
add('sup_2', `<msup>${Q}${n(2)}</msup>`);
add('sup_3', `<msup>${Q}${n(3)}</msup>`);
add('sup_4', `<msup>${Q}${n(4)}</msup>`);
add('sup_c', `<msup>${Q}${WZ}</msup>`);
add('sup_blank', `<msup>${Q}<mrow/></msup>`);
add('sup_base_c', `<msup>${QW}${W}</msup>`);
add('sub', `<msub>${Q}${W}</msub>`);
add('sub_c', `<msub>${Q}${WZ}</msub>`);
add('subsup', `<msubsup>${Q}${W}${Z}</msubsup>`);
add('subsup_c1', `<msubsup>${Q}${WZ}${Z}</msubsup>`);
add('subsup_c2', `<msubsup>${Q}${W}${WZ}</msubsup>`);
add('subsup_c3', `<msubsup>${Q}${WZ}${QW}</msubsup>`);
add('multi_post', `<mmultiscripts>${Q}${W}${Z}</mmultiscripts>`);
add('multi_pre', `<mmultiscripts>${Q}<mprescripts/>${W}${Z}</mmultiscripts>`);
add('multi_both', `<mmultiscripts>${Q}${W}${Z}<mprescripts/>${W}${Z}</mmultiscripts>`);
add('multi_none', `<mmultiscripts>${Q}<none/>${Z}<mprescripts/>${W}<none/></mmultiscripts>`);
// under / over
const SUM = '<mo>&#x2211;</mo>';
add('under_sum', `<munder>${SUM}${W}</munder>`);
add('over_sum', `<mover>${SUM}${W}</mover>`);
add('underover_sum', `<munderover>${SUM}${W}${Z}</munderover>`);
add('underover_sum_c', `<munderover>${SUM}${WZ}${Z}</munderover>`);
add('under_lim', `<munder>${i('lim')}${W}</munder>`);
add('under_max', `<munder>${i('max')}${W}</munder>`);
add('under_gen', `<munder>${Q}${W}</munder>`);
add('over_gen', `<mover>${Q}${W}</mover>`);
add('underover_gen', `<munderover>${Q}${W}${Z}</munderover>`);
add('under_gen_c', `<munder>${QW}${Z}</munder>`);
add('over_gen_c', `<mover>${QW}${Z}</mover>`);
add('over_arrow', `<mover>${Q}<mo>&#x2192;</mo></mover>`);
add('over_bar', `<mover>${Q}<mo>&#xAF;</mo></mover>`);
add('over_hat', `<mover>${Q}<mo>^</mo></mover>`);
add('under_brace', `<munder>${QW}<mo>&#x23DF;</mo></munder>`);
add('over_brace', `<mover>${QW}<mo>&#x23DE;</mo></mover>`);
add('under_arrow_sym', `<munder><mo>&#x2192;</mo>${W}</munder>`);
add('underover_arrow_sym', `<munderover><mo>&#x2192;</mo>${W}${Z}</munderover>`);
add('integral_sub', `<msub><mo>&#x222B;</mo>${W}</msub>`);
add('integral_subsup', `<msubsup><mo>&#x222B;</mo>${W}${Z}</msubsup>`);
// fences
add('fence', `<mfenced open="(" close=")">${Q}</mfenced>`);
add('fence_2', `<mfenced open="(" close=")">${Q}${W}</mfenced>`);
add('fence_3sep', `<mfenced open="(" close=")" separators=";">${Q}${W}${Z}</mfenced>`);
add('fence_empty', `<mfenced open="(" close=")"/>`);
for (const [a, b] of [['[', ']'], ['{', '}'], ['|', '|'], ['||', '||'], ['&#x27E8;', '&#x27E9;'], ['&#x230A;', '&#x230B;'], ['&#x2308;', '&#x2309;'], ['&#x27E6;', '&#x27E7;'], ['&lt;', '&gt;'], ['', ')'], ['(', ''], ['', ''], ['&#x2016;', '&#x2016;'], ['/', '\\\\'], ['&#x3008;', '&#x3009;']])
  add(`fence_${a}_${b}`, `<mfenced open="${a}" close="${b}">${Q}</mfenced>`);
for (const s of [',', '.', ';', ':', ' ', '|', '-', '+', '*'])
  add(`fence_sep_${s}`, `<mfenced open="(" close=")" separators="${s}">${Q}${W}</mfenced>`);
// tables
add('table', `<mtable><mtr><mtd>${Q}</mtd><mtd>${W}</mtd></mtr><mtr><mtd>${Z}</mtd><mtd>${Q}</mtd></mtr></mtable>`);
add('table_cell', `<mtable><mtr><mtd>${QW}</mtd><mtd>${W}</mtd></mtr></mtable>`);
add('table_attrs', `<mtable columnalign="left"><mtr><mtd>${Q}</mtd></mtr></mtable>`);
add('table_attrs2', `<mtable columnalign="left" columnspacing="2em"><mtr><mtd>${Q}</mtd></mtr></mtable>`);
add('table_empty_cell', `<mtable><mtr><mtd><mrow/></mtd><mtd>${W}</mtd></mtr></mtable>`);
// enclose
for (const nt of ['longdiv', 'actuarial', 'box', 'roundedbox', 'circle', 'left', 'right', 'top', 'bottom', 'updiagonalstrike', 'downdiagonalstrike', 'verticalstrike', 'horizontalstrike', 'madruwb', 'radical', 'phasorangle', 'updiagonalstrike downdiagonalstrike', 'verticalstrike horizontalstrike'])
  add(`enc_${nt}`, `<menclose notation="${nt}">${Q}</menclose>`);
add('enc_box_c', `<menclose notation="box">${QW}</menclose>`);
add('enc_strike_c', `<menclose notation="updiagonalstrike">${QW}</menclose>`);
add('enc_box_empty', `<menclose notation="box"><mrow/></menclose>`);
add('enc_strike_empty', `<menclose notation="updiagonalstrike"><mrow/></menclose>`);
// style / space / text
add('style_inline', `<mstyle displaystyle="false">${Q}</mstyle>`);
add('style_display', `<mstyle displaystyle="true">${Q}</mstyle>`);
add('style_size', `<mstyle mathsize="24px">${Q}</mstyle>`);
add('text', `<mtext>hello</mtext>`);
add('text_sp', `<mtext>hello&#xA0;world</mtext>`);
add('space_w', `<mspace width="1em"/>`);
add('space_back', `<mspace width="-0.2em"/>`);
add('space_nl', `${Q}<mspace linebreak="newline"/>${W}`);
add('space_blank', `<mspace/>`);
// number / tokens
add('neg_num', `${o('-')}${n(1)}`);
add('neg_id', `${o('-')}${Q}`);
add('minus_bin', `${Q}${o('-')}${W}`);
add('plus_minus', `${Q}${o('&#xB1;')}${W}`);
add('minus_plus', `${Q}${o('&#x2213;')}${W}`);
add('dec', `${n('3')}${o('.')}${n('14')}`);
add('dec_lead', `${o('.')}${n('5')}`);
add('dec_trail', `${n('3')}${o('.')}`);
add('comma_num', `${n('1')}${o(',')}${n('000')}`);
add('bold_id', `<mi mathvariant="bold">Q</mi>`);
add('bold_num', `<mn mathvariant="bold">7</mn>`);
add('bold_op', `<mo mathvariant="bold">+</mo>`);
add('italic_id', `<mi mathvariant="italic">Q</mi>`);
add('italic_multi', `<mi mathvariant="italic">QW</mi>`);
add('normal_id', `<mi mathvariant="normal">Q</mi>`);
add('bolditalic_id', `<mi mathvariant="bold-italic">Q</mi>`);
add('script_id', `<mi mathvariant="script">Q</mi>`);
add('fraktur_id', `<mi mathvariant="fraktur">Q</mi>`);
add('dstruck_id', `<mi mathvariant="double-struck">Q</mi>`);
add('dstruck_num', `<mn mathvariant="double-struck">7</mn>`);
add('largeop', `<mo largeop="true">&#x2211;</mo>`);
add('numspace', `<mo>&#x2007;</mo>`);
add('paren_pair', `${o('(')}${Q}${o(')')}`);
add('bracket_pair', `${o('[')}${Q}${o(']')}`);
add('brace_pair', `${o('{')}${Q}${o('}')}`);
add('row2', `${Q}${W}`);
add('row3', `${Q}${o('+')}${W}${o('=')}${Z}`);
add('row_frac', `${Q}${o('+')}<mfrac>${W}${Z}</mfrac>`);
// stacks (many are errors in the service)
add('longdiv', `<mlongdiv longdivstyle="lefttop"><mn>3</mn><mn>12</mn><msgroup><mn>36</mn><msline/><mn>0</mn></msgroup></mlongdiv>`);
add('mstack', `<mstack charalign="center" stackalign="right"><mn>12</mn><msrow><mo>+</mo><mn>34</mn></msrow><msline/><mn>46</mn></mstack>`);
const post = async (mml, lang) => {
  for (let k = 0; k < 4; k++) {
    try {
      const r = await fetch('https://www.wiris.net/demo/editor/mathml2accessible', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ mml, lang }) });
      return await r.text();
    } catch (e) { await new Promise((r) => setTimeout(r, 800)); }
  }
  return null;
};
const out = {};
const keys = Object.keys(P);
const worker = async () => {
  while (keys.length) {
    const k = keys.pop();
    out[k] = { mml: P[k], en: await post(P[k], 'en'), ar: await post(P[k], 'ar') };
  }
};
await Promise.all([worker(), worker(), worker(), worker()]);
fs.writeFileSync('tests/oracle/speech_templates.json', JSON.stringify(out, null, 1));
console.log('done', Object.keys(out).length);
