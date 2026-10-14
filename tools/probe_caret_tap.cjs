// tap to place the caret on a phone, LTR and RTL: where does the caret go for taps on each half of each glyph?
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const rtl of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(process.env.URL || 'http://localhost:8099/?output=0');
    await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button'));
    await p.waitForTimeout(700);
    const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
    await p.evaluate(({ rtl, NS }) => editor.setMathML(`<math ${rtl ? 'dir="rtl" ' : ''}${NS}><mi>a</mi><mo>+</mo><mn>12</mn><mo>+</mo><mi>c</mi><mo>+</mo><mi>d</mi></math>`), { rtl, NS });
    await p.waitForTimeout(500);
    const g = await p.evaluate(() => [...document.querySelectorAll('.wrs_formulaDisplay svg text')].map((t) => { const r = t.getBoundingClientRect(); return { t: t.textContent, l: r.left, r: r.right, y: r.top + r.height / 2 }; }));
    console.log(rtl ? '\nRTL' : '\nLTR', g.map((x) => `${x.t}[${Math.round(x.l)}-${Math.round(x.r)}]`).join(' '));
    const caret = () => p.evaluate(() => { const c = editor.core.caret; return c.index; });
    // element index of each glyph: a=0 +=1 12=2 +=3 c=4 +=5 d=6
    const startIdx = [0, 1, 2, 4, 5, 6, 7], len = [1, 1, 2, 1, 1, 1, 1]; // '12' is two elements
    await p.touchscreen.tap(g[0].l + 2, g[0].y + 90); // the first tap only brings the keyboard up
    await p.waitForTimeout(1500);
    await p.touchscreen.tap(g[0].l + 2, g[0].y + 90);
    await p.waitForTimeout(1500);
    let bad = 0;
    for (let i = 0; i < g.length; i++) {
      const x = g[i];
      const mid = (x.l + x.r) / 2, q = x.t === '12' ? (x.r - x.l) / 2 - 2 : (x.r - x.l) / 4;
      // the start edge of the glyph in the reading direction: left in LTR, right in RTL
      const startSide = rtl ? mid + q : mid - q, endSide = rtl ? mid - q : mid + q;
      for (const [label, px, want] of [['start half', startSide, startIdx[i]], ['end half', endSide, startIdx[i] + len[i]]]) {
        await p.touchscreen.tap(px, x.y);
        await p.waitForTimeout(900); // apart enough not to be a double tap
        const got = await caret();
        if (got !== want) { bad++; console.log(`  tap ${x.t} ${label} (x=${Math.round(px)}): caret ${got}, expected ${want}`); }
      }
    }
    // empty area to the end side of the formula: caret at the end
    await p.touchscreen.tap(rtl ? 40 : 350, g[0].y);
    await p.waitForTimeout(250);
    console.log('  tap in the empty area on the far side -> caret', await caret(), '(formula length 8)');
    await p.touchscreen.tap(rtl ? 380 : 4, g[0].y + 60);
    await p.waitForTimeout(250);
    console.log('  tap in the empty area below, start side -> caret', await caret());
    console.log(`  ${bad} mismatches`);
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
