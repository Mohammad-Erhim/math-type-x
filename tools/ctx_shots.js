// Screenshots of the contextual panel at every caret stop of a formula list (reference or our build).
// usage: CASES=file.json OUT=dir [URL=…] [DSF=1] [LANGUAGE=ar] [RTL=1] node tools/ctx_shots.js   → OUT/<name>_<i>.png
const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const cases = process.env.CASES ? JSON.parse(fs.readFileSync(process.env.CASES, 'utf8')) : require('./ctx_cases').cases;
  fs.mkdirSync(process.env.OUT, { recursive: true });
  const { b, p } = await open({ dsf: +(process.env.DSF || 1) });
  await p.addStyleTag({ content: '.wrs_caret,.wrs_underlineCaret,.wrs_inverseCaret{display:none !important}' });
  const box = await p.locator('#editorContainer').boundingBox();
  const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
  const WAIT = +(process.env.WAIT || 450);
  for (const c of cases) {
    try {
      await p.keyboard.press('Escape').catch(() => {});
      await p.evaluate((m) => editor.setMathML(m), `<math${process.env.RTL ? ' dir="rtl"' : ''} ${NS}>${c.mml}</math>`);
      await p.waitForTimeout(WAIT + 300);
      await p.locator('#editorContainer .wrs_header button').nth(9).click();
      await p.waitForTimeout(250);
      await p.mouse.click(box.x + 600, box.y + 330);
      await p.waitForTimeout(150);
      await p.keyboard.press(process.env.RTL ? 'End' : 'Home');
      await p.waitForTimeout(150);
      const n = Math.min(c.steps ?? 6, 8);
      for (let i = 0; i <= n; i++) {
        await p.waitForTimeout(WAIT / 2);
        await p.screenshot({ path: `${process.env.OUT}/${c.name}_${i}.png`, clip: { x: box.x, y: box.y, width: box.width, height: 140 } });
        await p.keyboard.press('ArrowRight');
        await p.waitForTimeout(WAIT / 2);
      }
    } catch (e) { console.log('ERR', c.name, String(e).slice(0, 100)); }
  }
  await b.close();
})();
