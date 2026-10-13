// randomized UI session: clicks on toolbar controls / the formula area, typing, keys, tab switching, hand mode toggles.
// Fails on page errors, console errors or an unparsable editor.getMathML().  usage: SEED=1 STEPS=150 node tools/fuzz_ui.js
const { chromium } = require('playwright');
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
(async () => {
  const rand = rng(Number(process.env.SEED || 1));
  const steps = Number(process.env.STEPS || 150);
  const url = process.env.URL || 'http://localhost:8099/?output=0';
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const problems = [];
  p.on('pageerror', (e) => problems.push('pageerror: ' + String(e).slice(0, 300)));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|net::ERR|Failed to load resource/.test(m.text())) problems.push('console: ' + m.text().slice(0, 300)); });
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'));
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const log = [];
  const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Backspace', 'Delete', 'Enter', 'Shift+ArrowLeft', 'Shift+ArrowRight', 'Control+z', 'Control+y', 'Control+a', 'Tab', 'Escape', 'Space'];
  const CH = '0123456789abxyz+-=()[]/^_<>.,;:!|*';
  for (let i = 0; i < steps; i++) {
    const r = rand();
    let what = '';
    try {
      if (r < 0.3) {
        // a visible toolbar control
        const btns = await p.$$('#editorContainer .wrs_toolbar button.wrs_button:not(.wrs_disabled)');
        const vis = [];
        for (const bt of btns) if (await bt.isVisible()) vis.push(bt);
        if (vis.length) { const bt = pick(vis); what = 'click ' + (await bt.getAttribute('title')); await bt.click({ timeout: 3000, force: true }); }
      } else if (r < 0.55) {
        const ch = pick(Array.from(CH)); what = 'type ' + ch; await p.keyboard.type(ch);
      } else if (r < 0.7) {
        const k = pick(KEYS); what = 'key ' + k; await p.keyboard.press(k);
      } else if (r < 0.82) {
        const bx = await p.locator('#editorContainer .wrs_formulaDisplay').boundingBox();
        if (bx) { const x = bx.x + 5 + rand() * (bx.width - 10); const y = bx.y + 5 + rand() * Math.min(bx.height - 10, 250); what = `mouse ${Math.round(x - bx.x)},${Math.round(y - bx.y)}`; await p.mouse.click(x, y); }
      } else if (r < 0.9) {
        const tabs = await p.$$('#editorContainer .wrs_header button');
        const t = pick(tabs); what = 'tab ' + (await t.getAttribute('title')); await t.click({ timeout: 3000, force: true });
      } else if (r < 0.95) {
        const exp = await p.$$('#editorContainer button.wrs_expandButton');
        const vis = []; for (const e of exp) if (await e.isVisible()) vis.push(e);
        if (vis.length) { what = 'expand'; await pick(vis).click({ timeout: 3000, force: true }); }
      } else {
        what = 'drag'; const bx = await p.locator('#editorContainer .wrs_formulaDisplay').boundingBox();
        if (bx) { await p.mouse.move(bx.x + 8, bx.y + 20); await p.mouse.down(); await p.mouse.move(bx.x + 60 + rand() * 100, bx.y + 20 + rand() * 60, { steps: 4 }); await p.mouse.up(); }
      }
      log.push(what);
      await p.waitForTimeout(40);
      // invariants
      const mml = await p.evaluate(() => editor.getMathML());
      const ok = await p.evaluate((m) => { try { const d = new DOMParser().parseFromString(m, 'application/xml'); return !d.querySelector('parsererror'); } catch { return false; } }, mml);
      if (!ok) problems.push(`step ${i} (${what}): unparsable MathML ${mml.slice(0, 200)}`);
    } catch (e) {
      problems.push(`step ${i} (${what}): ${String(e).slice(0, 200)}`);
    }
    if (problems.length) break;
  }
  console.log('steps', log.length, 'problems', problems.length);
  for (const x of problems) console.log(' ', x);
  if (problems.length) console.log('last actions:', log.slice(-10).join(' | '));
  await b.close();
  process.exit(problems.length ? 1 : 0);
})();
