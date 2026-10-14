// long press to select on a phone, LTR and RTL: selection, keyboard, handles fully visible, dragging the handles
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
    const g = await p.evaluate(() => [...document.querySelectorAll('.wrs_formulaDisplay svg text')].map((t) => { const r = t.getBoundingClientRect(); return [t.textContent, r.left + r.width / 2, r.top + r.height / 2]; }));
    const st = () => p.evaluate(() => { const f = document.querySelector('.wrs_focusElement'); return { sel: editor.core.hasSelection() ? editor.core.selectionMathML().replace(/ xmlns="[^"]*"/, '') : '(none)', focus: document.activeElement === f, inputMode: f.inputMode }; });
    const hs = () => p.evaluate(() => { const v = document.querySelector('.wrs_formulaDisplay').getBoundingClientRect(); return { view: [Math.round(v.left), Math.round(v.right)], handles: [...document.querySelectorAll('.wrs_forSelection')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.top + r.height / 2)]; }) }; });
    await p.touchscreen.tap(g[0][1], g[0][2] + 80); await p.waitForTimeout(1200); // keyboard up
    console.log(rtl ? '\nRTL' : '\nLTR', 'before:', JSON.stringify(await st()));
    const t = g[2]; // the 12
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: t[1], y: t[2] }] });
    await p.waitForTimeout(700);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(500);
    console.log('long press on 12:', JSON.stringify(await st()));
    const h = await hs();
    console.log('handles:', JSON.stringify(h), 'fully inside the view:', h.handles.every((x) => x[0] >= h.view[0] && x[1] <= h.view[1]));
    // drag the end handle (rightmost in LTR, leftmost in RTL) in by two glyphs
    const sorted = [...h.handles].sort((a, b) => a[0] - b[0]);
    const endH = rtl ? sorted[0] : sorted[sorted.length - 1];
    const from = [(endH[0] + endH[1]) / 2, endH[2]];
    const to = [g[4][1] + (rtl ? -6 : 6), from[1]]; // after c
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from[0], y: from[1] }] });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from[0] + ((to[0] - from[0]) * i) / 10, y: from[1] - 10 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(400);
    console.log('after dragging the end handle to after c:', JSON.stringify(await st()));
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
