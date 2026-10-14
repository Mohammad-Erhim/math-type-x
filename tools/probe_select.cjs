// selection by touch in LTR and RTL: double tap selects the run under the finger, the handles extend it, tapping elsewhere clears it
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
    const cdp = await ctx.newCDPSession(p);
    const leaves = await p.evaluate(() => [...document.querySelectorAll('.wrs_formulaDisplay svg text, .wrs_formulaDisplay svg g text')].map((t) => { const r = t.getBoundingClientRect(); return [t.textContent, Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; }));
    console.log(rtl ? '\nRTL' : '\nLTR', 'glyphs:', JSON.stringify(leaves));
    const sel = () => p.evaluate(() => { const c = editor.core; return c.hasSelection() ? c.selectionMathML().replace(/ xmlns="[^"]*"/, '') : '(none)'; });
    const target = leaves.find((l) => l[0] === '12') || leaves[2];
    const tap = (x, y) => p.touchscreen.tap(x, y);
    await tap(target[1], target[2]); await p.waitForTimeout(80); await tap(target[1], target[2]);
    await p.waitForTimeout(500);
    console.log('double tap on 12 ->', await sel());
    const handles = await p.evaluate(() => [...document.querySelectorAll('.wrs_forSelection')].map((e) => { const r = e.getBoundingClientRect(); return [e.className, Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2), Math.round(r.width), Math.round(r.height), getComputedStyle(e).display]; }));
    console.log('handles:', JSON.stringify(handles.filter((h) => h[5] !== 'none')));
    const drag = async (from, to) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from[0], y: from[1] }] });
      for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from[0] + ((to[0] - from[0]) * i) / 10, y: from[1] - 14 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await p.waitForTimeout(350);
    };
    const hs = async () => (await p.evaluate(() => [...document.querySelectorAll('.wrs_forSelection')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; }))).sort((a, b) => a[0] - b[0]);
    const glyph = (t) => leaves.find((l) => l[0] === t);
    // the end of the reading direction: right in LTR, left in RTL – drag it in to the glyph before 'd'
    let h2 = await hs();
    const endHandle = rtl ? h2[0] : h2[h2.length - 1];
    await drag(endHandle, [glyph('c')[1] + (rtl ? -6 : 6), endHandle[1]]);
    console.log('drag the end handle in, to after c      ->', await sel());
    h2 = await hs();
    const startHandle = rtl ? h2[h2.length - 1] : h2[0];
    await drag(startHandle, [glyph('+')[1] + (rtl ? -5 : 5), startHandle[1]]);
    console.log('drag the start handle in, to after the + ->', await sel());
    await tap(leaves[leaves.length - 1][1], leaves[0][2] + 40);
    await p.waitForTimeout(300);
    console.log('tap elsewhere (clears the selection)    ->', await sel());
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
