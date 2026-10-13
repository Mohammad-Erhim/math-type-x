// Arabic probe A/B: state + typing + toolbar compare between an en and an ar editor on the reference page.
const { open } = require('./lib.js');
const fs = require('fs');
(async () => {
  const { b, p, log } = await open();
  await p.evaluate(() => {
    for (const l of ['en', 'ar']) {
      const d = document.createElement('div');
      d.id = 'host_' + l;
      d.style.cssText = 'width:725px;height:415px;position:relative;margin:10px';
      document.body.insertBefore(d, document.body.firstChild);
      const ed = com.wiris.jsEditor.JsEditor.newInstance({ language: l });
      ed.insertInto(d);
      window['ed_' + l] = ed;
    }
  });
  await p.waitForTimeout(5000);
  const res = {};
  for (const l of ['en', 'ar']) {
    res[l] = await p.evaluate((l) => {
      const e = window['ed_' + l];
      return { rightToLeft: e.rightToLeft, language: e.language, mml: e.getMathML() };
    }, l);
  }
  console.log(JSON.stringify(res));
  // typing
  const typed = {};
  for (const l of ['en', 'ar']) {
    const host = p.locator('#host_' + l);
    await host.scrollIntoViewIfNeeded();
    const bb = await host.boundingBox();
    for (const s of ['1', '12.5', 'x', 'ا', 'س+ص', 'x/2', '1,5', 'a b']) {
      await p.evaluate((l) => window['ed_' + l].setMathML('<math xmlns="http://www.w3.org/1998/Math/MathML"/>'), l);
      await p.waitForTimeout(150);
      await p.mouse.click(bb.x + 300, bb.y + 250);
      await p.keyboard.type(s, { delay: 40 });
      await p.waitForTimeout(250);
      typed[l + ':' + s] = await p.evaluate((l) => window['ed_' + l].getMathML(), l);
    }
  }
  console.log(JSON.stringify(typed, null, 1));
  // toolbar per tab
  const tabs = {};
  for (const l of ['en', 'ar']) {
    tabs[l] = [];
    for (let t = 0; t < 9; t++) {
      await p.evaluate(([l, t]) => {
        const h = document.getElementById('host_' + l);
        h.querySelectorAll('.wrs_header button[role=tab]')[t].click();
      }, [l, t]);
      await p.waitForTimeout(250);
      tabs[l].push(await p.evaluate((l) => {
        const h = document.getElementById('host_' + l);
        const panel = h.querySelector('.wrs_toolbar');
        const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        return Array.from(panel.querySelectorAll('.wrs_container button, .wrs_container select, .wrs_container input')).filter(vis).map((e) => {
          const r = e.getBoundingClientRect();
          const hr = h.getBoundingClientRect();
          const img = e.querySelector('img');
          return { tag: e.tagName, title: e.title, x: Math.round(r.x - hr.x), y: Math.round(r.y - hr.y), w: Math.round(r.width), cls: e.className, img: img ? (img.src || '').slice(-60) : '', bg: getComputedStyle(e).backgroundPosition };
        });
      }, l));
    }
  }
  fs.writeFileSync('evidence/ref_lang_tabs.json', JSON.stringify({ res, typed, tabs }, null, 1));
  console.log('tab sizes', tabs.en.map((x) => x.length), tabs.ar.map((x) => x.length));
  await p.locator('#host_ar').screenshot({ path: process.env.S + '/ref_ar_tab.png' });
  await b.close();
})();
