// reads, for every toolbar control of the reference (panel buttons and group pop-ups), the sprite cell it shows
const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ dsf: 1 });
  const read = () => p.evaluate(() => [...document.querySelectorAll('#editorContainer button.wrs_button')].filter((e) => e.getBoundingClientRect().width > 0 && e.querySelector('img')).map((e) => { const im = e.querySelector('img'); const r = e.getBoundingClientRect(); return { title: e.title, sprite: im.src.split('/').pop().split('?')[0], ml: im.style.marginLeft, mt: im.style.marginTop, w: parseInt(e.style.width) || Math.round(r.width), h: parseInt(e.style.height) || Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }; }));
  const out = {};
  for (let t = 0; t < 9; t++) {
    await p.evaluate((k) => document.querySelectorAll('#editorContainer .wrs_header button')[k].click(), t);
    await p.waitForTimeout(300);
    const panel = await read();
    const groups = [];
    const n = await p.locator('#editorContainer .wrs_expandButton:visible').count();
    for (let g = 0; g < n; g++) {
      await p.locator('#editorContainer .wrs_expandButton:visible').nth(g).click();
      await p.waitForTimeout(350);
      const all = await read();
      const keys = new Set(panel.map((e) => e.title + '|' + e.x + '|' + e.y));
      groups.push(all.filter((e) => !keys.has(e.title + '|' + e.x + '|' + e.y) || true).filter((e) => !panel.some((q) => q.x === e.x && q.y === e.y && q.title === e.title)));
      await p.keyboard.press('Escape');
      await p.waitForTimeout(250);
      await p.locator('#editorContainer .wrs_header button').nth(t).click();
      await p.waitForTimeout(200);
    }
    out[t] = { panel, groups };
    console.log(t, panel.length, groups.map((g) => g.length).join(','));
  }
  fs.writeFileSync('evidence/sprite_map.json', JSON.stringify(out));
  await b.close();
})();
