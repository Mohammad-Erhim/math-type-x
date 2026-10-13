// touch interaction at phone size: taps, pop-ups, handwriting, contextual tab; screenshots to OUT
const { chromium } = require('playwright');
const OUT = process.env.OUT || '.cache/touch';
require('fs').mkdirSync(OUT, { recursive: true });
const SIZE = (process.env.SIZE || '390x844').split('x').map(Number);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: SIZE[0], height: SIZE[1] }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)));
  await p.goto(process.env.URL || 'http://localhost:8099/?output=0', { waitUntil: 'load' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button'));
  await p.waitForTimeout(500);
  const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
  const vis = (loc) => loc.first().boundingBox();
  const mml = () => p.evaluate(() => editor.getMathML().replace(/ xmlns="[^"]*"/, ''));
  // 1. tap the fraction button (first big button of the General tab)
  await p.locator('#editorContainer button[title^="Fraction"]').first().tap();
  await p.waitForTimeout(200);
  console.log('fraction:', await mml());
  await p.keyboard.type('a');
  // 2. the Symbols tab, then the arrow ("More") of its first group
  await p.locator('#editorContainer .wrs_header button[role=tab]').nth(1).tap();
  await p.waitForTimeout(200);
  const more = p.locator('#editorContainer .wrs_expandButton:visible').first();
  await more.tap();
  await p.waitForTimeout(300);
  await shot('popup-more');
  const pop = await p.locator('.wrs_popup').first().boundingBox();
  const root = await p.locator('.wrs_editor').boundingBox();
  console.log('popup inside editor:', pop && pop.x >= root.x - 1 && pop.x + pop.width <= root.x + root.width + 1 && pop.y + pop.height <= root.y + root.height + 1, JSON.stringify(pop), JSON.stringify(root));
  await p.keyboard.press('Escape');
  // 3. scroll the panel and tap a far button
  await p.evaluate(() => { document.querySelector('.wrs_panelContainer').scrollLeft = 400; });
  await p.waitForTimeout(150);
  await shot('panel-scrolled');
  // 4. tab: tap the 5th tab (matrices) and open the matrix picker
  await p.locator('#editorContainer .wrs_header button[role=tab]').nth(4).tap();
  await p.waitForTimeout(200);
  await shot('tab-matrices');
  // 5. contextual tab (last) with the caret in the fraction
  await p.locator('#editorContainer .wrs_header button[role=tab]').nth(9).tap();
  await p.waitForTimeout(200);
  await shot('tab-context');
  // 6. handwriting
  await p.locator('.wrs_handWrapper').tap();
  await p.waitForTimeout(800);
  await shot('hand-empty');
  const c = await p.locator('.wrs_hand canvas').boundingBox();
  const touchStroke = async (pts) => {
    await p.touchscreen.tap(0, 0).catch(() => {});
  };
  // pointer events with the mouse API are enough to draw
  const draw = async (pts) => {
    await p.mouse.move(c.x + pts[0][0], c.y + pts[0][1]);
    await p.mouse.down();
    for (const q of pts.slice(1)) await p.mouse.move(c.x + q[0], c.y + q[1], { steps: 2 });
    await p.mouse.up();
  };
  const line = (a, bb) => Array.from({ length: 10 }, (_, i) => [a[0] + ((bb[0] - a[0]) * i) / 9, a[1] + ((bb[1] - a[1]) * i) / 9]);
  await draw(line([60, 120], [110, 190]));
  await draw(line([110, 120], [60, 190]));
  await draw(line([140, 155], [185, 155]));
  await draw(line([162, 132], [162, 178]));
  await p.waitForTimeout(3500);
  await shot('hand-drawn');
  console.log('canvas', JSON.stringify(c), 'recognised:', await mml());
  await b.close();
})();
