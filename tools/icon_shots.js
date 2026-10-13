// Toolbar screenshots of every tab (and its drop-down panels) for an icon-by-icon comparison of two builds.
// usage: URL=<page> [LANGUAGE=ar] [RTL=1] OUT=dir node tools/icon_shots.js   → OUT/tab<N>.png, OUT/tab<N>_x<K>.png, OUT/rects.json
const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const OUT = process.env.OUT || 'icon_out';
  fs.mkdirSync(OUT, { recursive: true });
  const { b, p } = await open({ dsf: +(process.env.DSF || 1) });
  await p.addStyleTag({ content: '.wrs_caret,.wrs_underlineCaret,.wrs_inverseCaret{display:none !important}' });
  const box = await p.locator('#editorContainer').boundingBox();
  const sleep = (ms) => p.waitForTimeout(ms);
  if (process.env.RTL) {
    const btn = await p.evaluate(() => { const e = [...document.querySelectorAll('#editorContainer button')].find((x) => /Right to left/i.test(x.title || '')); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    if (btn) { await p.mouse.click(btn.x, btn.y); await sleep(300); }
  }
  const rects = {};
  const tabs = p.locator('#editorContainer .wrs_header button');
  for (let t = 0; t < 9; t++) {
    await tabs.nth(t).click(); await sleep(400);
    await p.mouse.move(5, 5);
    const list = await p.evaluate(() => [...document.querySelectorAll('#editorContainer button.wrs_button, #editorContainer button.wrs_expandButton')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .map((e) => { const r = e.getBoundingClientRect(); return { title: e.title, x: r.x, y: r.y, w: r.width, h: r.height }; }));
    rects['tab' + t] = list.map((r) => ({ ...r, x: r.x - box.x, y: r.y - box.y }));
    await p.screenshot({ path: `${OUT}/tab${t}.png`, clip: { x: box.x, y: box.y, width: box.width, height: 130 } });
    const exp = list.filter((r) => /More/.test(r.title) || r.w < 12);
    for (let k = 0; k < exp.length; k++) {
      await p.mouse.click(exp[k].x + exp[k].w / 2, exp[k].y + exp[k].h / 2); await sleep(500);
      // every control inside the pop-up (the pop-up is whatever new visible buttons the arrow opened)
      const pop = await p.evaluate((before) => [...document.querySelectorAll('#editorContainer button.wrs_button, .wrs_popup button.wrs_button, .wrs_contextPanel button.wrs_button')]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && !before.includes(Math.round(r.x) + ',' + Math.round(r.y) + ',' + e.title); })
        .map((e) => { const r = e.getBoundingClientRect(); return { title: e.title, x: r.x, y: r.y, w: r.width, h: r.height }; }), list.map((r) => Math.round(r.x) + ',' + Math.round(r.y) + ',' + r.title));
      rects[`tab${t}_x${k}`] = pop.map((r) => ({ ...r, x: r.x - box.x, y: r.y - box.y }));
      await p.screenshot({ path: `${OUT}/tab${t}_x${k}.png`, clip: { x: box.x, y: box.y, width: box.width, height: 330 } });
      await p.keyboard.press('Escape'); await sleep(250);
      await p.mouse.click(box.x + 300, box.y + 330); await sleep(150);
      await tabs.nth(t).click(); await sleep(250);
    }
  }
  fs.writeFileSync(`${OUT}/rects.json`, JSON.stringify(rects));
  await b.close();
})();
