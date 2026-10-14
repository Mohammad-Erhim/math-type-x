// RTL vs LTR on a phone, directly on the formula: tap every caret position of every row, double tap, long press + handle drags
const { chromium } = require('playwright');
const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
const F = {
  flat: '<mi>a</mi><mo>+</mo><mn>12</mn><mo>=</mo><mi>c</mi><mo>-</mo><mi>d</mi>',
  arabic: '<mi>س</mi><mo>+</mo><mi>ص</mi><mo>=</mo><mn>٣</mn><mo>×</mo><mi>ع</mi>',
  frac: '<mi>x</mi><mo>+</mo><mfrac><mrow><mi>a</mi><mo>+</mo><mn>1</mn></mrow><mrow><mi>b</mi><mo>-</mo><mi>c</mi></mrow></mfrac><mo>=</mo><msqrt><mi>y</mi><mo>+</mo><mn>2</mn></msqrt>',
  mix: '<mtext>مرحبا بالعالم</mtext><mo>+</mo><mn>12</mn><mo>=</mo><msup><mi>x</mi><mn>2</mn></msup>',
};
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const name of (process.env.ONLY||Object.keys(F).join(",")).split(",")) for (const rtl of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(process.env.URL || 'http://localhost:8099/?output=0');
    await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button'));
    await p.waitForTimeout(600);
    await p.evaluate(({ rtl, NS, m }) => editor.setMathML(`<math ${rtl ? 'dir="rtl" ' : ''}${NS}>${m}</math>`), { rtl, NS, m: F[name] });
    await p.waitForTimeout(500);
    await p.touchscreen.tap(200, 700); await p.waitForTimeout(1200);
    // every row, every caret position: client x/y of the position, then tap slightly inside the cell toward each neighbour
    const rows = await p.evaluate(() => {
      const d = editor.display, lay = d.layout, r = d.content.getBoundingClientRect(), out = [];
      for (const [key, g] of lay.rows) {
        const y = key === '' ? lay.lines[0].y : g.y;
        out.push({ key, path: g.path, xs: g.xs.map((x) => r.left + x), hx: (g.hx || g.xs).map((x) => r.left + x), y: r.top + y - g.a / 2 });
      }
      return out;
    });
    let bad = 0, n = 0;
    for (const row of rows) {
      const hx = row.hx;
      for (let i = 0; i < hx.length; i++) {
        // tap exactly on the stop, then 2px toward the inside
        for (const dx of [0]) {
          const x = hx[i] + dx;
          await p.touchscreen.tap(x, row.y);
          await p.waitForTimeout(Number(process.env.GAP||650));
          const got = await p.evaluate(() => ({ p: JSON.stringify(editor.core.caret.path), i: editor.core.caret.index }));
          n++;
          // acceptable: same row & index, or a neighbouring stop at the same x
          const ok = got.p === JSON.stringify(row.path) && (got.i === i || Math.abs(hx[got.i] - hx[i]) < 1.5);
          if (!ok) { bad++; console.log(`  ${name} ${rtl ? 'RTL' : 'LTR'} row "${row.key}" stop ${i} x=${Math.round(x)} y=${Math.round(row.y)} -> ${got.p} ${got.i}`); }
        }
      }
    }
    console.log(`${name} ${rtl ? 'RTL' : 'LTR'}: ${n} taps, ${bad} off`);
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
