// every control of the General tab on a desktop and on a phone (touch): reachable (nothing covers it after scrolling the panel),
// and what it does to the formula a+b (with the whole formula selected)
const { chromium } = require('playwright');
const URL_ = process.argv[2] || 'http://localhost:8099/?output=0';
const MML = '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi><mo>+</mo><mi>b</mi></math>';
async function run(label, mobile) {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(URL_).origin });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL_, { waitUntil: 'load' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button'));
  await p.waitForTimeout(800);
  const titles = await p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_panelContainer:not(.wrs_collapsed) button.wrs_button, #editorContainer .wrs_panelContainer select')].filter((e) => e.offsetParent).map((e) => e.title || e.getAttribute('aria-label') || e.tagName));
  const mml = () => p.evaluate(() => editor.getMathML().replace(/ xmlns="[^"]*"/, ''));
  console.log(`\n== ${label}: ${titles.length} controls`);
  const bad = [];
  for (const t of titles) {
    await p.evaluate((m) => editor.setMathML(m), MML);
    await p.waitForTimeout(150);
    const display = p.locator('.wrs_formulaDisplay, .wrs_canvasContainer').first();
    const box = await display.boundingBox();
    if (mobile) await p.touchscreen.tap(box.x + 30, box.y + 20); else await p.mouse.click(box.x + 30, box.y + 20);
    await p.keyboard.press('Control+a');
    const before = await mml();
    const sel = t === 'Font family' || t === 'Font size';
    const loc = sel ? p.locator(`#editorContainer select[title="${t}"], #editorContainer select[aria-label="${t}"]`).first() : p.locator(`#editorContainer .wrs_panelContainer button[title="${t.replace(/"/g, '\\"')}"]`).first();
    if (!(await loc.count())) { bad.push(`${t}: not found`); continue; }
    // reachable: scroll it into view in the panel, then ask what is on top at its centre
    await loc.scrollIntoViewIfNeeded();
    if (mobile) await p.evaluate((tt) => {
      const c = document.querySelector('#editorContainer .wrs_panelContainer');
      c.scrollTop = Math.max(0, c.scrollTop);
    }, t);
    const top = await loc.evaluate((e) => {
      const r = e.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const el = document.elementFromPoint(x, y);
      return el === e || e.contains(el) ? 'ok' : 'COVERED by ' + (el && (el.className || el.tagName));
    });
    let covered = top !== 'ok';
    if (covered && mobile) {
      // a user scrolls the panel to its end: then the cue is gone
      await p.evaluate(() => { const c = document.querySelector('#editorContainer .wrs_panelContainer'); c.scrollTop = c.scrollHeight; });
      await p.waitForTimeout(250);
      const top2 = await loc.evaluate((e) => { const r = e.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el === e || e.contains(el) ? 'ok' : 'COVERED by ' + (el && (el.className || el.tagName)); });
      covered = top2 !== 'ok';
      if (covered) bad.push(`${t}: ${top2}`);
    } else if (covered) bad.push(`${t}: ${top}`);
    if (sel) { console.log(`  ${t.padEnd(46)} (select) reachable: ${covered ? 'NO' : 'yes'}`); continue; }
    if (/Insert special|Color/.test(t)) {
      // opens a dialog / palette
      try { if (mobile) await loc.tap({ timeout: 3000 }); else await loc.click({ timeout: 3000 }); } catch (e) { bad.push(`${t}: ${e.message.split('\n')[0]}`); continue; }
      await p.waitForTimeout(300);
      const open = await p.evaluate(() => !!document.querySelector('.wrs_popup, .wrs_dialog, [role=dialog], .wrs_palette, .wrs_colorPicker, .wrs_pickerPanel'));
      console.log(`  ${t.padEnd(46)} opens a popup: ${open}`);
      if (!open) bad.push(`${t}: no popup`);
      await p.keyboard.press('Escape');
      continue;
    }
    try { if (mobile) await loc.tap({ timeout: 3000 }); else await loc.click({ timeout: 3000 }); } catch (e) { bad.push(`${t}: ${e.message.split('\n')[0]}`); continue; }
    await p.waitForTimeout(250);
    const after = await mml();
    console.log(`  ${t.padEnd(46)} ${before === after ? '(no change)'.padEnd(12) : 'changed'.padEnd(12)} ${after === before ? '' : after.slice(0, 90)}`);
  }
  console.log('PROBLEMS:', bad.length ? '\n  ' + bad.join('\n  ') : 'none', '| page errors:', errors.length ? errors : 'none');
  await b.close();
}
(async () => { await run('desktop', false); await run('phone (touch)', true); })().catch((e) => { console.error(e); process.exit(1); });
