// Dump toolbar element geometry/styles of the reference (all tabs) for the layout data file.
const fs = require('fs');
const { open } = require('./lib');
(async () => {
  const { b, p } = await open({ dsf: 1 });
  const box = await p.locator('#editorContainer').boundingBox();
  const out = { tabs: [], header: null, states: {} };
  const rectsJs = (ox, oy) => () => {
    const root = document.querySelector('#editorContainer');
    const o = root.getBoundingClientRect();
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const res = [];
    root.querySelectorAll('.wrs_toolbar .wrs_panelContainer *').forEach((e) => {
      if (!vis(e)) return;
      const cs = getComputedStyle(e);
      const tag = e.tagName.toLowerCase();
      if (!['button', 'span', 'div', 'select', 'table', 'td'].includes(tag)) return;
      if (tag === 'td' || tag === 'table') return;
      const r = e.getBoundingClientRect();
      res.push({ tag, cls: e.className, title: e.getAttribute('title'), x: +(r.x - o.x).toFixed(2), y: +(r.y - o.y).toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), bg: cs.backgroundColor, bgi: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 160) : undefined, bw: cs.borderTopWidth, bc: cs.borderTopColor, br: cs.borderRadius, pos: cs.position, fs: cs.fontSize, fw: cs.fontWeight, color: cs.color, txt: tag === 'select' ? [...e.options].map(o => o.value + '|' + o.text) : undefined, text: tag !== 'select' && e.children.length === 0 ? e.textContent.slice(0, 40) : undefined });
    });
    return res;
  };
  // header
  out.header = await p.evaluate(() => {
    const root = document.querySelector('#editorContainer');
    const o = root.getBoundingClientRect();
    return [...root.querySelectorAll('.wrs_header > *, .wrs_linksContainer *, .wrs_toolbar, .wrs_panelContainer, .wrs_header')].map((e) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { tag: e.tagName.toLowerCase(), cls: e.className, title: e.getAttribute('title'), x: +(r.x - o.x).toFixed(2), y: +(r.y - o.y).toFixed(2), w: r.width, h: r.height, bg: cs.backgroundColor, bgi: cs.backgroundImage.slice(0, 200), bgp: cs.backgroundPosition, bgs: cs.backgroundSize, bw: cs.borderTopWidth, bc: cs.borderTopColor, brad: cs.borderRadius, margin: cs.margin };
    });
  });
  const tabs = p.locator('#editorContainer .wrs_header button');
  for (let i = 0; i < 10; i++) {
    await tabs.nth(i).click();
    await p.waitForTimeout(400);
    out.tabs.push(await p.evaluate(rectsJs()));
    await p.mouse.move(box.x + 700, box.y + 380);
    await p.screenshot({ path: `${process.env.OUT || '/tmp'}/tb_tab${i}.png`, clip: { x: box.x, y: box.y, width: 725, height: 100 } });
  }
  // states of a button on tab 0
  await tabs.nth(0).click();
  await p.waitForTimeout(300);
  const st = async (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); return { bg: cs.backgroundColor, bgi: cs.backgroundImage.slice(0, 200), border: cs.border, br: cs.borderRadius, opacity: cs.opacity, filter: cs.filter, cls: e.className, outline: cs.outline, boxShadow: cs.boxShadow }; }, sel);
  const fracSel = '#editorContainer button[title="Fraction (Ctrl+/)"]';
  out.states.normal = await st(fracSel);
  await p.hover(fracSel); await p.waitForTimeout(200);
  out.states.hover = await st(fracSel);
  await p.mouse.move(box.x + 700, box.y + 380);
  await p.focus(fracSel).catch(() => {}); await p.waitForTimeout(100);
  out.states.focus = await st(fracSel);
  out.states.disabled = await st('#editorContainer button[title="Press Ctrl+C to copy the selection"]');
  out.states.toggled = await st('#editorContainer button[title="Automatic italic"]');
  out.states.small = await st('#editorContainer button[title="Plus sign"]');
  out.states.expand = await st('#editorContainer button.wrs_expandButton');
  fs.writeFileSync(process.argv[2] || '../evidence/toolbar_dump.json', JSON.stringify(out, null, 1));
  console.log('done', out.tabs.map((t) => t.length));
  await b.close();
})();
