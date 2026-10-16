// Records the README demo as frames: node tools/readme_demo.js <outdir>   (server on :8099)
// Every step takes a screenshot (device scale 3) with a caption, a section chip and the control to click;
// tools/readme_demo.py adds the pointer, title / closing cards and cross-fades and writes docs/media/demo.{gif,mp4}.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2] || path.join(__dirname, '..', '.cache', 'demo');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.URL || 'http://localhost:8099/';
const frames = [];

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 960, height: 560 }, deviceScaleFactor: 3 })).newPage();
  const T = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'i18n', 'ar.json'), 'utf8'));
  const ar = (s) => T[s] ?? s;
  const ready = async (lang) => {
    await p.goto(BASE + `?lang=${lang}&persist=0`, { waitUntil: 'load' });
    await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button'));
    await p.waitForTimeout(900);
  };
  await ready('en');

  let chip = '';
  const wait = (ms) => p.waitForTimeout(ms);
  // one frame: caption, how long it stays (ms), the control the pointer goes to, whether the zoom inset is shown
  const shot = async (caption, ms, ring, inset = true, zoomSel = null) => {
    let box = null;
    if (ring) {
      const bb = await ring.first().boundingBox();
      if (bb) box = [bb.x, bb.y, bb.width, bb.height];
    }
    const file = `${String(frames.length).padStart(3, '0')}.png`;
    await p.screenshot({ path: path.join(OUT, file) });
    const fb = await p.evaluate(() => {
      const e = document.querySelector('.wrs_formulaContent');
      const d = document.querySelector('.wrs_formulaDisplay');
      if (!e || !d) return null;
      const r = e.getBoundingClientRect();
      const q = d.getBoundingClientRect();
      return r.width > 4 && r.height > 4 ? { f: [r.x, r.y, r.width, r.height], d: [q.x, q.y, q.width, q.height] } : null;
    });
    let zbox = null;
    if (zoomSel) {
      const zb = await p.locator(zoomSel).first().boundingBox();
      if (zb) zbox = [zb.x, zb.y, zb.width, zb.height];
    }
    frames.push({ file, caption, chip, ms, ring: box, inset: inset && (!!fb || !!zbox), fbox: fb && fb.f, dbox: fb && fb.d, zbox });
  };
  const click = async (loc, caption, ms = 1100, inset = true) => { await shot(caption, ms, loc, inset); await loc.first().click(); await wait(350); };
  const key = async (t, d = 200) => { await p.keyboard.type(t); await wait(d); };
  const tab = (n) => p.locator(`.wrs_toolbar button[title*="Alt+${n}"]`);
  const ctl = (t) => p.locator(`.wrs_toolbar [title="${ar(t)}"]`);
  const palette = () => p.locator(`[title="${ar('Insert special characters')}"]`);
  const letter = (cp) => p.locator(`.wrs_zulfiButton[title$="U+${cp}"]`);

  // ---- 0. the same editor in English
  chip = 'ENGLISH';
  await shot('One editor for English and Arabic mathematics', 1800, null, false);
  await p.locator('#editorContainer').click({ position: { x: 300, y: 300 } });
  await key('x'); await key(' ', 100); await key('=', 300);
  await click(p.locator('.wrs_toolbar [title="Fraction (Ctrl+/)"]').first(), 'Fractions, roots and powers from the toolbar', 800);
  await key('-', 120); await key('b', 120); await key('±', 300);
  await click(p.locator('.wrs_toolbar [title="Square root"]').first(), 'Build the formula piece by piece', 800);
  await key('b', 120);
  await p.keyboard.press('Control+ArrowUp'); await wait(200); await key('2', 150);
  await p.keyboard.press('ArrowRight'); await key('-', 100); await key('4', 100); await key('a', 100); await key('c', 300);
  await p.keyboard.press('ArrowDown'); await wait(250); await key('2', 150); await key('a', 400);
  await shot('The quadratic formula – in English', 2400);
  await p.keyboard.press('Control+A'); await wait(200); await p.keyboard.press('Delete'); await wait(300);

  // ---- 0b. how to turn Arabic on, from the English interface
  chip = 'TURN ON ARABIC';
  const en = (t) => p.locator(`.wrs_toolbar [title="${t}"]`);
  await shot('Arabic is three buttons away', 1700, null, false);
  await click(en('Right to left editing'), '1  Right to left editing: formulas grow from the right', 1100, false);
  await p.locator('#editorContainer').click({ position: { x: 700, y: 300 } });
  await key('ب', 150); await key('س', 150); await key('م', 400);
  await shot('Letters stay separate – like variables in a formula', 1700);
  await p.keyboard.press('Control+A'); await wait(150); await p.keyboard.press('Delete'); await wait(250);
  await click(en('Arabic ligature'), '2  Arabic ligature: typed letters join into a word', 1100, false);
  await p.locator('#editorContainer').click({ position: { x: 700, y: 300 } });
  await key('ب', 150); await key('س', 150); await key('م', 400);
  await shot('Now they connect, as in written Arabic', 1900);
  await p.keyboard.press('Control+A'); await wait(150); await p.keyboard.press('Delete'); await wait(250);
  await click(en('Insert special characters'), '3  Insert special characters', 1000, false);
  await p.locator('.wrs_unicodeChooserPanel select').selectOption('Z:letters'); await wait(500);
  await shot('Choose “Arabic math letters” to get the Arabic mathematical letters', 2600, null, false);
  await p.keyboard.press('Escape'); await wait(300);
  await shot('…or open the page with ?lang=ar for a fully Arabic interface', 2000, null, false);
  await ready('ar');

  // ---- 1. right to left
  chip = 'RIGHT TO LEFT';
  await shot('Arabic interface – the formula grows from the right', 1800, null, false);
  await p.locator('#editorContainer').click({ position: { x: 800, y: 300 } });
  await key('ص'); await key(' '); await key('=', 300);
  await shot('Type with the Arabic keyboard', 1000);
  await click(ctl('Fraction (Ctrl+/)'), 'Fractions, roots and powers from the toolbar', 900);
  await key('-', 150); await key('ب', 150); await key('±', 300);
  await click(ctl('Square root'), 'A square root inside the numerator', 900);
  await key('ب', 150);
  await p.keyboard.press('Control+ArrowUp'); await wait(200); await key('٢', 150);
  await p.keyboard.press('ArrowLeft'); await key('-', 100); await key('٤', 100); await key('أ', 100); await key('ج', 300);
  await shot('Arabic-Indic digits and Arabic letters, laid out right to left', 1500);
  await p.keyboard.press('ArrowDown'); await wait(250); await key('٢', 150); await key('أ', 400);
  await shot('The quadratic formula in Arabic', 2600);

  // ---- 3. Arabic math letters
  chip = 'ARABIC MATH LETTERS';
  await shot('Next: Arabic math letters', 900);
  await p.mouse.click(400, 250); await wait(300);
  await p.keyboard.press('Control+A'); await wait(250); await p.keyboard.press('Delete'); await wait(500);
  await click(palette(), 'Open the special characters palette', 800, false);
  await shot('Arabic math letters, one click each', 2400, null, false);
  await letter('E199').click(); await wait(450);
  await shot('Pick a letter…', 900);
  await key('(', 200); await key('س', 200); await key(')', 400);
  await shot('Math letters sit on the line of the ordinary Arabic text', 1900);

  // ---- 3. derivative marks
  chip = 'DERIVATIVE MARKS';
  // back to the math letter: three steps left in the text (")", "س", "(") and select it
  for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowRight'); await wait(150); }
  await p.keyboard.press('Shift+ArrowRight'); await wait(300);
  await tab(6).click(); await wait(450);
  await click(ctl('Element over'), 'Select a letter and put a mark above it', 900, true);
  await p.keyboard.press('ArrowUp'); await wait(300);
  await tab(1).click(); await wait(400);
  await click(palette(), 'Derivative marks come in 1, 2 and 3', 700, true);
  await letter('E19A').click(); await wait(500);
  await shot('The mark stands clear above the letter, even with text next to it', 2400);

  // ---- 4. absolute position
  chip = 'ABSOLUTE POSITION';
  await p.keyboard.press('Shift+ArrowRight'); await wait(400);
  await click(p.locator('.wrs_toolbar .wrs_context'), 'Select anything and open the contextual tab', 900);
  await shot('Four arrows move it pixel by pixel', 1700);
  const nud = (t) => p.locator(`.wrs_toolbar [title="${ar(t)}"]`);
  for (let i = 1; i <= 3; i++) { await shot(`Right ${i} px`, 750, nud('Nudge right')); await nud('Nudge right').click(); await wait(900); }
  for (let i = 1; i <= 3; i++) { await shot(`Up ${i} px`, 750, nud('Nudge up')); await nud('Nudge up').click(); await wait(900); }
  await shot('The exact offset is saved inside the formula', 2600);


  // ---- 5. export: the PNG image of the finished formula (no other output tab is opened)
  chip = 'EXPORT';
  await click(p.locator('#mtx-tab-png'), 'Export the formula as a PNG image', 1000, false);
  await wait(2000);
  await shot('A crisp PNG with the mark exactly where you put it', 3200, p.locator('.mtx_foot button:has-text("نسخ")'), true, '.mtx_body img');
  await b.close();
  fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify(frames, null, 1));
  console.log(frames.length, 'frames', OUT);
})();
