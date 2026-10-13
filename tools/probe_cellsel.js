// cell selection of a table: selection steps and what Delete / typing / Backspace do (URL env: reference or ours)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto(process.env.URL || 'https://www.wiris.com/en/mathtype/', { waitUntil: 'load', timeout: 150000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 90000 });
  await p.waitForTimeout(2500);
  await p.locator('#editorContainer').scrollIntoViewIfNeeded();
  const M = '<mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced>';
  const bx = await p.locator('#editorContainer').boundingBox();
  const run = async (label, keys) => {
    await p.evaluate((m) => editor.setMathML(`<math xmlns="http://www.w3.org/1998/Math/MathML">${m}</math>`), M);
    await p.waitForTimeout(900);
    await p.mouse.click(bx.x + 600, bx.y + 330);
    await p.keyboard.press('Home');
    for (const k of keys) { if (k.startsWith('type:')) await p.keyboard.type(k.slice(5)); else await p.keyboard.press(k); await p.waitForTimeout(120); }
    await p.waitForTimeout(400);
    console.log(label.padEnd(28), (await p.evaluate(() => editor.getMathML())).replace(/ xmlns="[^"]*"/, '').replace(/<\/?m(row|fenced|table)[^>]*>/g, (m) => m.startsWith('</') ? '' : '').slice(0, 150));
  };
  const R = 'ArrowRight', S = 'Shift+ArrowRight';
  await run('delete a', [R, R, S, 'Delete']);
  await run('delete a,b', [R, R, S, S, 'Delete']);
  await run('delete col a,c', [R, R, S, S, S, 'Delete']);
  await run('delete all cells', [R, R, S, S, S, S, 'Delete']);
  await run('delete table', [R, R, S, S, S, S, S, 'Delete']);
  await run('backspace a,b', [R, R, S, S, 'Backspace']);
  await run('type x over a,b', [R, R, S, S, 'type:x']);
  await run('type x over all', [R, R, S, S, S, S, 'type:x']);
  await run('shift+left from d', [R, R, R, R, R, R, R, R, 'Shift+ArrowLeft', 'Shift+ArrowLeft', 'Shift+ArrowLeft', 'Delete']);
  await run('shift+down a,c', [R, R, 'Shift+ArrowDown', 'Delete']);
  await b.close();
})();
