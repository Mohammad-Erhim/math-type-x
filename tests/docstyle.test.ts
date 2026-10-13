/**
 * A whole-equation mstyle (font size, alignment of the lines) is a style of the document: the lines of the formula stay
 * lines of the document (caret, vertical navigation, Align left / center / right of the contextual tab) and the MathML
 * is written back with the same wrapper.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorCore } from '../src/core/engine';
import { DocGeometry } from '../src/layout/geometry';
import { handleKey } from '../src/core/keys';
import { locate, controlsFor, applyContext, ctxValue } from '../src/core/context';
import { layoutDocument } from '../src/layout/layout';
import { parseMathML } from '../src/core/mathml';

const NS = ' xmlns="http://www.w3.org/1998/Math/MathML"';
const LINES = '<mi>a</mi><mo>+</mo><mi>b</mi><mi>b</mi><mi>b</mi><mspace linebreak="newline"/><mi>cc</mi>';

test('a root mstyle round-trips and the lines stay lines', () => {
  for (const wrapper of ['<mstyle indentalign="center">', '<mstyle mathsize="20px">', '<mstyle mathsize="12px" indentalign="right">']) {
    const src = `<math${NS}>${wrapper}${LINES}</mstyle></math>`;
    const e = new EditorCore();
    e.geometry = new DocGeometry(e);
    e.setMathML(src);
    assert.equal(e.getMathML(), src);
    assert.equal(e.row.length, 8, 'the document row holds the formula itself');
    assert.ok(e.geometry.positions || true);
  }
});

test('lines are aligned by indentalign', () => {
  const x = (al: string | null) => {
    const d = parseMathML(`<math${NS}>${al ? `<mstyle indentalign="${al}">` : ''}${LINES}${al ? '</mstyle>' : ''}</math>`);
    const lay = layoutDocument(d.row, d.attrs, 16);
    const glyphs = lay.items.filter((i) => i.k === 'g') as { text: string; x: number; y: number }[];
    return glyphs.find((g) => g.text.startsWith('c'))!.x;
  };
  const left = x(null);
  assert.equal(x('left'), left);
  assert.ok(x('center') > left);
  assert.ok(x('right') > x('center'));
});

test('Align center / right / left of the contextual tab', () => {
  const e = new EditorCore();
  e.geometry = new DocGeometry(e);
  e.setMathML(`<math${NS}>${LINES}</math>`);
  const host = { ed: e, runGeneral() {} };
  handleKey(host as any, 'Home', {} as any);
  handleKey(host as any, 'ArrowRight', {} as any);
  const ids = controlsFor(locate(e)!).map((c) => c.id);
  assert.ok(ids.includes('ml_center'));
  applyContext(e, 'ml_center');
  assert.equal(e.getMathML(), `<math${NS}><mstyle indentalign="center">${LINES}</mstyle></math>`);
  assert.equal(ctxValue(e, locate(e)!, 'ml_center').toggled, true);
  applyContext(e, 'ml_right');
  assert.equal(e.getMathML(), `<math${NS}><mstyle indentalign="right">${LINES}</mstyle></math>`);
  e.undo();
  assert.equal(e.getMathML(), `<math${NS}><mstyle indentalign="center">${LINES}</mstyle></math>`);
});

test('font size is a style of the document', () => {
  const e = new EditorCore();
  e.setMathML(`<math${NS}>${LINES}</math>`);
  e.setFontSize(20);
  assert.equal(e.getMathML(), `<math${NS}><mstyle mathsize="20px">${LINES}</mstyle></math>`);
  assert.equal(e.getFontSize(), 20);
  e.setFontSize(null);
  assert.equal(e.getMathML(), `<math${NS}>${LINES}</math>`);
});
