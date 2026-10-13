const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ dsf: 2 });
  const sleep = ms => p.waitForTimeout(ms);
  const listButtons = async () => p.evaluate(() => [...document.querySelectorAll('#editorContainer button.wrs_button')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map(e => { const r = e.getBoundingClientRect(); return { title: e.getAttribute('aria-label') || e.title, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; }));
  let n = 0;
  for (let t = 0; t < 9; t++) {
    await p.locator('#editorContainer .wrs_header button').nth(t).click(); await sleep(400);
    const base = await listButtons();
    const baseKeys = new Set(base.map(x => `${Math.round(x.x)},${Math.round(x.y)}`));
    const expanders = await p.evaluate(() => [...document.querySelectorAll('#editorContainer button.wrs_expandButton')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map(e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
    for (let e = 0; e < expanders.length; e++) {
      await p.mouse.click(expanders[e].x, expanders[e].y); await sleep(450);
      const after = await listButtons();
      const popup = after.filter(x => !baseKeys.has(`${Math.round(x.x)},${Math.round(x.y)}`));
      for (let k = 0; k < popup.length; k++) {
        const it = popup[k];
        await p.screenshot({ path: `out/t${t}_x${e}_i${k}_icon.png`, clip: { x: it.x - it.w / 2 - 2, y: it.y - it.h / 2 - 2, width: it.w + 4, height: it.h + 4 } });
        n++;
      }
      await p.keyboard.press('Escape'); await sleep(200);
      await p.locator('#editorContainer .wrs_header button').nth(t).click(); await sleep(250);
    }
    console.log('tab', t, 'done', n);
  }
  await b.close();
})();
