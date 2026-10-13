const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ dsf: 1 });
  const res = [];
  const probe = async (w, h) => {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(700);
    return p.evaluate(() => {
      const c = document.querySelector('#editorContainer'); const r = c.getBoundingClientRect(); const cs = getComputedStyle(c);
      let hiddenBy = null; for (let e = c; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') { hiddenBy = e.tagName + '.' + String(e.className).slice(0, 60) + ' display=' + s.display; break; } }
      const col = c.closest('.wp-block-columns');
      return { rect: [r.x, r.y, r.width, r.height].map(Math.round), visible: r.width > 0 && r.height > 0 && !hiddenBy, hiddenBy, colDisplay: col ? getComputedStyle(col).display : null, tabs: [...document.querySelectorAll('#editorContainer .wrs_header button')].filter(x => x.getBoundingClientRect().width > 0).length, docW: document.documentElement.scrollWidth };
    });
  };
  const sizes = [[1920, 1080], [1600, 900], [1440, 900], [1366, 768], [1280, 800], [1200, 800], [1100, 800], [1024, 768], [900, 700], [800, 600], [768, 1024], [600, 800], [375, 700]];
  for (const [w, h] of sizes) {
    const info = await probe(w, h);
    let shot = null;
    if (info.visible) { await p.locator('#editorContainer').scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(300); shot = `sc/s15_${w}.jpg`; await p.screenshot({ path: shot, type: 'jpeg', quality: 70 }); }
    else { shot = `sc/s15_${w}.jpg`; await p.screenshot({ path: shot, type: 'jpeg', quality: 70 }); }
    res.push({ w, h, ...info, shot });
    console.log(w, h, JSON.stringify(info).slice(0, 220));
  }
  // find breakpoint between 1281 and 1100 by bisection
  let lo = 1100, hi = 1280;
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); const i = await probe(mid, 800); if (i.visible) hi = mid; else lo = mid; }
  res.push({ breakpoint: hi, note: `editor visible from ${hi}px viewport width, hidden at ${lo}px` });
  console.log('breakpoint', hi);
  fs.writeFileSync('sc/s15_responsive.json', JSON.stringify({ name: 's15_responsive', res, steps: res.filter(x => x.w).map((x, i) => ({ n: i + 1, desc: `Viewport ${x.w}×${x.h}: ${x.visible ? 'playground visible' : 'playground HIDDEN'}`, shot: x.shot, mathml: null, net: [], extra: { rect: x.rect, hiddenBy: x.hiddenBy, colDisplay: x.colDisplay, docWidth: x.docW } })), breakpoint: hi }, null, 1));
  await b.close();
})();
