// Dump geometry of rendered formulas in the reference formula display.
// usage: node measure.js cases.json out.json   (cases: {name: "<math>...</math>"})
const fs = require('fs');
const { open } = require('./lib');
(async () => {
  const cases = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const { b, p } = await open({ dsf: 1 });
  const res = {};
  for (const [name, mml] of Object.entries(cases)) {
    await p.evaluate((m) => editor.setMathML(m), mml.includes('xmlns') ? mml : mml.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"'));
    await p.waitForTimeout(700);
    res[name] = await p.evaluate(() => {
      const fd = document.querySelector('#editorContainer .wrs_formulaDisplay');
      const o = fd.getBoundingClientRect();
      const out = [];
      const walk = (el, depth) => {
        for (const c of el.children) {
          const r = c.getBoundingClientRect();
          const cs = getComputedStyle(c);
          if (/wrs_(caret|inverseCaret|underlineCaret|focusElement|ariaLive|fontContainer|metrics|clipboard|caretPrecision)/.test(c.className + ' ' + (c.parentElement ? c.parentElement.className : ''))) continue;
          const text = [...c.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
          const bg = cs.backgroundColor;
          const hasBg = bg !== 'rgba(0, 0, 0, 0)';
          const bt = cs.borderTopWidth, bb = cs.borderBottomWidth, bl = cs.borderLeftWidth, br = cs.borderRightWidth;
          const hasBorder = parseFloat(bt) + parseFloat(bb) + parseFloat(bl) + parseFloat(br) > 0;
          const hasImg = c.tagName === 'IMG' || c.tagName === 'CANVAS' || c.tagName === 'svg' || cs.backgroundImage !== 'none';
          if ((text.trim() || hasBg || hasBorder || hasImg) && r.width > 0) out.push({ d: depth, tag: c.tagName.toLowerCase(), cls: c.className, t: text, x: +(r.x - o.x).toFixed(2), y: +(r.y - o.y).toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), fs: cs.fontSize, ff: cs.fontFamily.slice(0, 30), fst: cs.fontStyle, fw: cs.fontWeight, va: cs.verticalAlign, bg: hasBg ? bg : undefined, bt, bb, bl, br, pos: cs.position, top: c.style.top, left: c.style.left, lh: cs.lineHeight, color: cs.color, img: hasImg ? (c.tagName + ':' + (c.getAttribute && (c.getAttribute('src') || '').slice(-40))) : undefined });
          walk(c, depth + 1);
        }
      };
      walk(fd, 0);
      return out;
    });
    if (process.env.SHOTS) { const fd = await p.locator('#editorContainer .wrs_formulaDisplay').boundingBox(); await p.mouse.click(fd.x + 600, fd.y + 280); await p.waitForTimeout(100); await p.screenshot({ path: process.env.SHOTS + '/' + name + '.png', clip: { x: fd.x, y: fd.y, width: 200, height: 120 } }); }
    console.log(name, res[name].length);
  }
  fs.writeFileSync(process.argv[3], JSON.stringify(res, null, 1));
  await b.close();
})();
