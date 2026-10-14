// Cut / Copy / Paste toolbar buttons on a desktop and on a phone (touch) – what ends on the clipboard and in the formula
// usage: node tools/probe_clip.cjs [url]
const { chromium } = require('playwright');
const URL_ = process.argv[2] || 'http://localhost:8099/?output=0';
const MML = '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi><mo>+</mo><mi>b</mi></math>';
async function run(label, mobile) {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(URL_).origin });
  const p = await ctx.newPage();
  await p.goto(URL_, { waitUntil: 'load' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button'));
  await p.waitForTimeout(800);
  const btn = (re) => p.locator('#editorContainer button').filter({ has: p.locator('xpath=.') }).evaluateAll((bs, src) => bs.map((e) => [e.title, e.getAttribute('aria-label')]).filter(([t, a]) => new RegExp(src).test(t || a || '')), re);
  console.log(`\n== ${label}`);
  console.log('buttons:', JSON.stringify(await btn('Ctrl\\+[CXV]|Copy|Cut|Paste')));
  const click = async (title) => {
    const l = p.locator(`#editorContainer button[title^="${title}"]`).first();
    if (!(await l.count())) throw new Error('no button ' + title);
    await l.scrollIntoViewIfNeeded();
    if (mobile) await l.tap(); else await l.click();
    await p.waitForTimeout(350);
  };
  const mml = () => p.evaluate(() => editor.getMathML().replace(/ xmlns="[^"]*"/, ''));
  const clip = () => p.evaluate(() => navigator.clipboard.readText().catch((e) => 'ERR ' + e.message));
  await p.evaluate((m) => editor.setMathML(m), MML);
  await p.waitForTimeout(400);
  // select all: Ctrl+A in the formula
  const box = await p.locator('.wrs_formulaDisplay, .wrs_canvasContainer').first().boundingBox();
  if (mobile) await p.touchscreen.tap(box.x + 30, box.y + 20); else await p.mouse.click(box.x + 30, box.y + 20);
  await p.waitForTimeout(300);
  await p.keyboard.press('Control+a');
  await p.waitForTimeout(200);
  console.log('formula:', await mml());
  await p.evaluate(() => navigator.clipboard.writeText('SENTINEL').catch(() => 0));
  await click('Press Ctrl+C');
  console.log('after Copy  -> clipboard:', JSON.stringify((await clip()).slice(0, 120)), '| formula:', await mml());
  await p.evaluate(() => navigator.clipboard.writeText('SENTINEL').catch(() => 0));
  await click('Press Ctrl+X');
  console.log('after Cut   -> clipboard:', JSON.stringify((await clip()).slice(0, 120)), '| formula:', await mml());
  await p.evaluate(() => navigator.clipboard.writeText('<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>z</mi><mo>+</mo><mn>1</mn></math>'));
  await click('Press Ctrl+V');
  await p.waitForTimeout(500);
  console.log('after Paste -> formula:', await mml());
  await b.close();
}
(async () => { await run('desktop', false); await run('phone (touch)', true); })().catch((e) => { console.error(e); process.exit(1); });
