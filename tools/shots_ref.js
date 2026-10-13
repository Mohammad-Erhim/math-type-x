// Capture reference screenshots of dialogs / states (DSF 2) for visual parity work.
const { open } = require('./lib');
(async () => {
  const OUT = process.env.OUT || '/home/ubuntu/Desktop/projects/math-type-x/evidence/shots';
  const { b, p } = await open({ dsf: 2 });
  const box = await p.locator('#editorContainer').boundingBox();
  const sleep = (ms) => p.waitForTimeout(ms);
  const clip = { x: box.x, y: box.y, width: 725, height: 415 };
  const shot = async (name, c) => { await p.screenshot({ path: `${OUT}/ref_${name}.png`, clip: c || clip }); console.log('shot', name); };
  const tabs = p.locator('#editorContainer .wrs_header button');
  const edit = { x: box.x + 400, y: box.y + 300 };
  await p.mouse.click(edit.x, edit.y); await sleep(200);
  // 1. symbols tab more popup
  await tabs.nth(1).click(); await sleep(300);
  await p.locator('#editorContainer button.wrs_expandButton:visible').nth(1).click(); await sleep(400);
  await shot('popup_symbols', { x: box.x, y: box.y, width: 725, height: 330 });
  await p.keyboard.press('Escape'); await sleep(200);
  // 2. greek popup (last group, large)
  await tabs.nth(3).click(); await sleep(300);
  const n = await p.locator('#editorContainer button.wrs_expandButton:visible').count();
  await p.locator('#editorContainer button.wrs_expandButton:visible').nth(n - 1).click(); await sleep(400);
  await shot('popup_greek_last', { x: box.x, y: box.y, width: 725, height: 415 });
  await p.keyboard.press('Escape'); await sleep(200);
  await p.locator('#editorContainer button.wrs_expandButton:visible').nth(1).click(); await sleep(400);
  await shot('popup_greek_2', { x: box.x, y: box.y, width: 725, height: 415 });
  await p.keyboard.press('Escape'); await sleep(200);
  // 3. matrix picker
  await tabs.nth(4).click(); await sleep(300);
  await p.locator('#editorContainer button[title="Matrix with parenthesis"]:visible').click(); await sleep(400);
  const cells = p.locator('#editorContainer table td, #editorContainer .wrs_matrixCell');
  await shot('picker_open', { x: box.x, y: box.y, width: 725, height: 415 });
  console.log('picker dom', await p.evaluate(() => { const e = [...document.querySelectorAll('#editorContainer *')].filter(x => /matrix|grid|popup|picker/i.test(x.className)); return e.map(x => x.tagName + '.' + x.className + ' ' + JSON.stringify(x.getBoundingClientRect().toJSON())).slice(0, 12); }));
  await p.keyboard.press('Escape'); await sleep(200);
  // 4. palette
  await tabs.nth(0).click(); await sleep(300);
  await p.locator('#editorContainer button[title="Color"]:visible').click(); await sleep(400);
  await shot('palette', { x: box.x, y: box.y, width: 725, height: 415 });
  console.log('palette dom', await p.evaluate(() => { const e = [...document.querySelectorAll('#editorContainer *')].filter(x => /color|palette|swatch/i.test(x.className)); return e.slice(0, 8).map(x => x.tagName + '.' + x.className + ' ' + JSON.stringify(x.getBoundingClientRect().toJSON())); }));
  await p.keyboard.press('Escape'); await sleep(200);
  // 5. special characters
  await p.locator('#editorContainer button[title="Insert special characters"]:visible').click(); await sleep(600);
  await shot('special', { x: box.x, y: box.y, width: 725, height: 415 });
  console.log('special dom', await p.evaluate(() => { const e = [...document.querySelectorAll('.wrs_editor *')].filter(x => /unicode|special|char|dialog|panel/i.test(x.className) && x.getBoundingClientRect().width > 50); return e.slice(0, 10).map(x => x.tagName + '.' + x.className + ' ' + JSON.stringify(x.getBoundingClientRect().toJSON())); }));
  await p.keyboard.press('Escape'); await sleep(200);
  // 6. contextual tab with matrix
  await p.evaluate(() => editor.setMathML('<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced></math>'));
  await sleep(800);
  await p.mouse.click(box.x + 12, box.y + 120); await sleep(300);
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await sleep(200);
  await tabs.nth(9).click(); await sleep(500);
  await shot('contextual_matrix', { x: box.x, y: box.y, width: 725, height: 415 });
  // 7. handwriting
  await p.locator('#editorContainer .wrs_handWrapper input[type=button], #editorContainer .wrs_handWrapper').first().click({ force: true, position: { x: 10, y: 100 } }).catch(() => {}); await sleep(800);
  await shot('hand_open', { x: box.x, y: box.y, width: 725, height: 415 });
  await b.close();
})();
