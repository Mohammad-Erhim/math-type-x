// dumps the DOM of the reference pop-ups (unicode, palette, matrix picker, group pop-up) to evidence/ref_panels.json
const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ dsf: 1 });
  const out = {};
  const dump = async (name, sel) => {
    out[name] = await p.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const clone = el.cloneNode(true);
      // shorten repeated children
      const seen = {};
      clone.querySelectorAll('*').forEach((c) => { const k = c.parentElement && c.parentElement.tagName + '.' + c.className; if (c.className && /wrs_unicodeButton|wrs_colorButton|wrs_matrixCell|wrs_emptyToolbarCell/.test(c.className)) { seen[k] = (seen[k] || 0) + 1; if (seen[k] > 2) c.remove(); } });
      const r = el.getBoundingClientRect();
      const css = (e) => { const c = getComputedStyle(e); return { l: e.offsetLeft, t: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight, bg: c.backgroundColor, bgi: c.backgroundImage.slice(0, 120), border: c.border, br: c.borderRadius, fs: c.fontSize, fw: c.fontWeight, color: c.color, pos: c.position }; };
      const tree = (e, d) => d > 6 ? null : { tag: e.tagName, cls: e.className, title: e.title || null, type: e.type || null, css: css(e), kids: [...e.children].slice(0, 6).map((k) => tree(k, d + 1)) };
      return { html: clone.outerHTML.slice(0, 6000), rect: [r.x, r.y, r.width, r.height], tree: tree(el, 0), parent: el.parentElement.className };
    }, sel);
  };
  await p.locator('#editorContainer .wrs_formulaDisplay').click({ position: { x: 300, y: 100 } }).catch(() => {});
  await p.locator('#editorContainer button[title="Insert special characters"]').click(); await p.waitForTimeout(800);
  await dump('unicode', '.wrs_unicodeChooserPanel');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.locator('#editorContainer button[title="Color"]').click(); await p.waitForTimeout(800);
  await dump('color', '.wrs_colorChooserPanel');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelectorAll('#editorContainer .wrs_header button')[4].click()); await p.waitForTimeout(500);
  await p.locator('#editorContainer button[title="Table"]').click(); await p.waitForTimeout(800);
  await dump('matrix', '.wrs_matrixButtonPanel');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelectorAll('#editorContainer .wrs_header button')[1].click()); await p.waitForTimeout(500);
  await p.locator('#editorContainer .wrs_expandButton').first().click(); await p.waitForTimeout(800);
  out.allPanels = await p.evaluate(() => [...document.querySelectorAll('#editorContainer > * , #editorContainer .wrs_editor > *')].map((e) => e.tagName + '.' + e.className));
  out.popupCandidates = await p.evaluate(() => [...document.querySelectorAll('[class*=Panel],[class*=popup],[class*=Popup],[class*=Chooser]')].map((e) => e.tagName + '.' + e.className + ' ' + e.offsetWidth + 'x' + e.offsetHeight));
  await dump('group', '.wrs_expandButton ~ *');
  fs.writeFileSync('evidence/ref_panels.json', JSON.stringify(out, null, 1));
  await b.close();
  console.log(Object.keys(out), out.popupCandidates);
})();
