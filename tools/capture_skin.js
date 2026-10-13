// captures the toolbar skin (tabs, panel background) of the reference with transparency (white/black backdrop trick)
const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ dsf: 1 });
  const bx = await p.locator('#editorContainer').boundingBox();
  await p.addStyleTag({ content: '#editorContainer .wrs_imageContainer, #editorContainer .wrs_multipleRowPanel *, #editorContainer .wrs_linksContainer, #editorContainer .wrs_contextPanel{visibility:hidden !important} #editorContainer .wrs_multipleRowPanel{background:none}' });
  const shot = async (name, bg) => {
    await p.evaluate((c) => { const e = document.querySelector('#editorContainer'); e.style.setProperty('background', c, 'important'); e.parentElement.style.setProperty('background', c, 'important'); }, bg);
    await p.waitForTimeout(150);
    await p.screenshot({ path: `evidence/skin/${name}_${bg === '#000' ? 'k' : 'w'}.png`, clip: { x: Math.round(bx.x), y: Math.round(bx.y), width: 725, height: 100 } });
  };
  for (const t of [0, 5, 9]) {
    await p.evaluate((k) => document.querySelectorAll('#editorContainer .wrs_header button')[k].click(), t);
    await p.mouse.move(5, 5);
    await p.waitForTimeout(300);
    await shot('state' + t, '#fff');
    await shot('state' + t, '#000');
  }
  // hover state of an unselected tab (tab 3) and of the contextual tab
  await p.evaluate(() => document.querySelectorAll('#editorContainer .wrs_header button')[0].click());
  for (const [name, idx] of [['hover3', 3], ['hover9', 9]]) {
    const r = await p.evaluate((k) => { const q = document.querySelectorAll('#editorContainer .wrs_header button')[k].getBoundingClientRect(); return [q.x, q.y, q.width, q.height]; }, idx);
    await p.mouse.move(r[0] + 5, r[1] + 12);
    await p.waitForTimeout(250);
    await shot(name, '#fff');
    await shot(name, '#000');
  }
  await b.close();
})();
