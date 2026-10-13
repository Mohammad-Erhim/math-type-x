import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderSvg } from '../src/render/svg';
import { ARABIC_FONTS, arabicFontOf, arabicCssFamily } from '../src/layout/arfonts';
import { FONT_FAMILIES } from '../src/ui/messages';
import { facesFor } from '../src/render/client';
import { EditorCore } from '../src/core/engine';
import { renderPng } from '../server/render';

const N = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const doc = (family: string, body = '<mi>س</mi><mo>=</mo><mn>٣</mn><mi>x</mi><mtext>مرحبا بالعالم</mtext>') =>
  `<math ${N}${family ? ` style="font-family:${/\s/.test(family) ? `'${family}'` : family}"` : ''}>${body}</math>`;

test('the Font list flags the Arabic faces as a group of their own', () => {
  const ar = FONT_FAMILIES.filter((f) => f.arabic);
  assert.deepEqual(ar.map((f) => f.value), ARABIC_FONTS.map((f) => f.value));
  assert.ok(ar.length >= 4);
  for (const f of ar) assert.ok(/[؀-ۿ]/.test(f.arabic!.arLabel), 'the name in Arabic script: ' + f.value);
  // values the equation stores are looked up case-insensitively
  assert.equal(arabicFontOf('tajawal')?.family, 'MTX Tajawal');
  assert.equal(arabicCssFamily('Arial'), '');
});

test('every face of the list ships as woff2 (browser) and ttf (image services), regular and bold', () => {
  for (const f of ARABIC_FONTS) for (const w of ['Regular', 'Bold']) {
    assert.ok(existsSync(join('server/fonts', `${f.stem}-${w}.ttf`)), `${f.stem}-${w}.ttf`);
    assert.ok(existsSync(join('public/fonts', `${f.stem}-${w}.woff2`)), `${f.stem}-${w}.woff2`);
  }
});

test('the chosen face draws the Arabic text and nothing else; Latin text keeps its face', () => {
  const plain = renderSvg(doc(''));
  assert.ok(!plain.svg.includes('MTX Tajawal'));
  const r = renderSvg(doc('Tajawal'));
  assert.equal(r.arabic, 'MTX Tajawal');
  const texts = [...r.svg.matchAll(/<text\b[^>]*font-family="([^"]*)"[^>]*>([^<]*)</g)];
  assert.ok(texts.length >= 3);
  for (const [, fam, t] of texts) {
    const arabic = /[؀-ۿ]/.test(t);
    assert.equal(fam.startsWith("'MTX Tajawal',"), arabic, `${t} → ${fam}`);
  }
});

test('Arabic metrics follow the face: another face, another width; the letters of other scripts do not move', () => {
  const w = (f: string, body?: string) => renderSvg(doc(f, body), { zoom: 1 }).width;
  const widths = new Set(ARABIC_FONTS.map((f) => w(f.value)));
  assert.ok(widths.size >= 3, 'faces differ in width: ' + [...widths]);
  for (const f of ARABIC_FONTS) assert.equal(w(f.value, '<mi>x</mi><mo>+</mo><mn>12</mn>'), w('', '<mi>x</mi><mo>+</mo><mn>12</mn>'), 'Latin only: ' + f.value);
});

test('the font family is kept in the equation and survives a round trip', () => {
  const c = new EditorCore();
  c.setFontFamily('Noto Sans Arabic');
  assert.equal(c.getFontFamily(), 'Noto Sans Arabic');
  const mml = c.getMathML();
  assert.match(mml, /font-family:'Noto Sans Arabic'/);
  const d = new EditorCore();
  d.setMathML(mml);
  assert.equal(d.getFontFamily(), 'Noto Sans Arabic');
  assert.equal(arabicCssFamily(d.getFontFamily()), 'MTX Noto Sans');
});

test('PNG export draws with the chosen face (different pixels, same layout width as the SVG)', () => {
  const a = renderPng(doc(''));
  const b = renderPng(doc('Noto Kufi Arabic'));
  assert.ok(!a.png.equals(b.png));
  assert.equal(b.width, renderSvg(doc('Noto Kufi Arabic')).width);
  assert.ok(b.width > 20 && b.height > 10);
});

test('the browser export embeds the chosen face next to the faces of the rest of the formula', () => {
  const faces = facesFor(renderSvg(doc('Tajawal', '<mi>س</mi><mi>x</mi>')).svg);
  const names = faces.map((f) => f.family);
  assert.ok(names.includes('MTX Tajawal'), names.join());
  assert.ok(names.includes('Liberation Sans'), 'the Latin letter still needs its sans face: ' + names.join());
});
