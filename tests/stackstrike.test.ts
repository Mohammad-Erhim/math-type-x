import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorCore } from '../src/core/engine';
import { locate, controlsFor, applyContext } from '../src/core/context';

const HEAD = '<mstack charalign="center" charspacing="15px" stackalign="right"><mn>12</mn><mn>34</mn><msrow/><msline/><mscarries location="se"/><msrow><mn>5</mn><none/><mn>6</mn></msrow>';
const PLUS = '<msrow><mo>+</mo><maction actiontype="argument"><mrow/></maction><none/></msrow>';
const M = `<math xmlns="http://www.w3.org/1998/Math/MathML">${HEAD}${PLUS}<msline/><msrow/></mstack></math>`;
const STRIKE = '<menclose notation="updiagonalstrike"';

/** "Up diagonal strike" in a stack: caret / selection reached with ArrowLeft and Shift+Left from the last row (reference, tools/probe_strike.js) */
test('up diagonal strike in a stack follows the reference', () => {
  const want: Record<string, string> = {
    '0/1': `<math>${HEAD}${PLUS}${STRIKE}><msline/></menclose><msrow/></mstack></math>`,
    '0/0': `<math>${HEAD}${PLUS}<msline/>${STRIKE}/></mstack></math>`,
    '1/1': `<math>${HEAD.replace('<mstack', '<mstack')}<msline/>${STRIKE}><mstack stackalign="right">${PLUS}</mstack></menclose></mstack></math>`,
    '1/0': `<math>${HEAD}${PLUS}<msline/>${STRIKE}/></mstack></math>`,
    '2/1': `<math>${HEAD}<msrow><mo>+</mo>${STRIKE}><maction actiontype="argument"><mrow/></maction><mo>&#xA0;</mo></menclose></msrow><msline/><msrow/></mstack></math>`,
    '2/0': `<math>${HEAD}<msrow><mo>+</mo><maction actiontype="argument"><mrow/></maction><none/>${STRIKE}/></msrow><msline/><msrow/></mstack></math>`,
  };
  for (const [key, expected] of Object.entries(want)) {
    const [lefts, shift] = key.split('/').map(Number);
    const ed = new EditorCore();
    ed.setMathML(M);
    const n = ed.row[0].c![0].length;
    ed.caret = { path: [[0, 0], [n - 1, 0]], index: 0 }; // a click at the bottom right lands in the last (empty) row
    for (let i = 0; i < lefts; i++) ed.moveLeft();
    if (shift) ed.moveLeft(true);
    const loc = locate(ed);
    assert.ok(loc && controlsFor(loc).some((c) => c.id === 'st_strike'), `${key}: strike control available`);
    applyContext(ed, 'st_strike');
    const got = ed.getMathML().replace(/ xmlns="[^"]+"/, '').replace(/<mstack[^>]*>/, (m) => (m.includes('charalign') ? m : '<mstack stackalign="right">'));
    const exp = expected.replace(/<mstack charalign="center" charspacing="15px" stackalign="right">/, '<mstack charalign="center" charspacing="15px" stackalign="right">');
    assert.equal(got, exp, `lefts ${lefts} shift ${shift}`);
  }
});
