// tap to place the caret in a formula wider than the phone (it scrolls), LTR and RTL, Latin and Arabic letters
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const [rtl, ar] of [[false, false], [true, false], [true, true]]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(process.env.URL || 'http://localhost:8099/?output=0');
    await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button'));
    await p.waitForTimeout(700);
    const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
    const letters = ar ? 'سصضطظعغفقكلمنهوي' : 'abcdefghijklmnopqrstuvwxyz';
    const toks = [...letters, ...letters].map((c, i) => `<mi>${c}</mi>${i % 3 === 2 ? '<mo>+</mo>' : ''}`).join('');
    await p.evaluate(({ rtl, NS, toks }) => editor.setMathML(`<math ${rtl ? 'dir="rtl" ' : ''}${NS}>${toks}</math>`), { rtl, NS, toks });
    await p.waitForTimeout(600);
    await p.touchscreen.tap(200, 600); await p.waitForTimeout(1200); // brings the keyboard up
    // scroll the formula: caret at the far end shows the end
    await p.evaluate(() => { editor.core.setCaret && 0; });
    const info = async () => p.evaluate(() => {
      const v = document.querySelector('.wrs_formulaDisplay'), vr = v.getBoundingClientRect();
      const g = [...v.querySelectorAll('svg text')].map((t) => { const r = t.getBoundingClientRect(); return { t: t.textContent, l: r.left, r: r.right, y: r.top + r.height / 2 }; });
      return { view: [Math.round(vr.left), Math.round(vr.right)], scroll: [v.scrollLeft, (v.parentElement || v).scrollLeft], g };
    });
    const n = (await info()).g.length;
    console.log(`\n${rtl ? 'RTL' : 'LTR'} ${ar ? 'Arabic' : 'Latin'}: ${n} glyphs`);
    // caret to the far end, then to the start, to scroll the display both ways
    for (const key of [rtl ? 'End' : 'End', 'Home']) {
      await p.keyboard.press(key);
      await p.waitForTimeout(500);
      const { view, g, scroll } = await info();
      const vis = g.map((x, i) => ({ ...x, i })).filter((x) => x.l > view[0] + 24 && x.r < view[1] - 24 && x.t.trim());
      let bad = 0, tested = 0;
      for (const x of vis.filter((_, k) => k % 3 === 0)) {
        const mid = (x.l + x.r) / 2, q = (x.r - x.l) / 4;
        const startSide = rtl ? mid + q : mid - q;
        await p.touchscreen.tap(startSide, x.y);
        await p.waitForTimeout(800);
        const got = await p.evaluate(() => editor.core.caret.index);
        // element indexes: every third letter is followed by '+': glyph i is element i + floor of '+' before it
        const glyphs = g.length;
        tested++;
        const plus = g.filter((y, j) => j < x.i && y.t === '+').length;
        const elIndex = x.i; // glyph order == element order (+ included)
        if (got !== elIndex) { bad++; if (bad <= 4) console.log(`   ${key}: tap ${x.t} (glyph ${x.i}) start half -> caret ${got}, expected ${elIndex}`); }
      }
      console.log(`  after ${key}: view ${view}, scrollLeft ${scroll}, tapped ${tested}, wrong ${bad}`);
    }
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
