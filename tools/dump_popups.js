// geometry of every group pop-up of the reference: container rect, table class and the position of its first cell
const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ dsf: 2 });
  const out = {};
  for (let t = 1; t < 9; t++) {
    await p.evaluate((k) => document.querySelectorAll('#editorContainer .wrs_header button')[k].click(), t);
    await p.waitForTimeout(300);
    const n = await p.locator('#editorContainer .wrs_expandButton:visible').count();
    for (let g = 0; g < n; g++) {
      await p.locator('#editorContainer .wrs_expandButton:visible').nth(g).click();
      await p.waitForTimeout(400);
      const r = await p.evaluate(() => {
        const ed = document.querySelector('#editorContainer .wrs_editor').getBoundingClientRect();
        const cps = [...document.querySelectorAll('#editorContainer .wrs_contextPanel')].filter((e) => e.offsetWidth > 40 && e.querySelector('button'));
        const cp = cps[cps.length - 1];
        if (!cp) return null;
        const pc = cp.querySelector('.wrs_panelContainer');
        const tb = cp.querySelector('table');
        const c = cp.getBoundingClientRect(), tr = tb.getBoundingClientRect();
        const cs = getComputedStyle(pc), ts = getComputedStyle(tb), ps = getComputedStyle(tb, '::before');
        const rows = tb.querySelectorAll('tr').length;
        const cols = Math.max(...[...tb.querySelectorAll('tr')].map((r2) => r2.children.length));
        return { left: c.x - ed.x, top: c.y - ed.y, w: c.width, h: c.height, table: tb.className, tl: tr.x - c.x, tt: tr.y - c.y, tw: tr.width, th: tr.height, rows, cols, pad: cs.padding, border: cs.border, radius: cs.borderRadius, margin: ts.margin, before: ps.content !== 'none' ? ps.backgroundImage.slice(0, 120) : null, bgi: cs.backgroundImage.slice(0, 100), bgSize: cs.backgroundSize, bgPos: cs.backgroundPosition, shadow: cs.boxShadow };
      });
      out[`${t}_${g + 1}`] = r;
      console.log(t, g + 1, JSON.stringify(r));
      await p.keyboard.press('Escape');
      await p.waitForTimeout(200);
      await p.locator('#editorContainer .wrs_header button').nth(t).click();
      await p.waitForTimeout(150);
    }
  }
  fs.writeFileSync('evidence/ref_popups.json', JSON.stringify(out, null, 1));
  await b.close();
})();
