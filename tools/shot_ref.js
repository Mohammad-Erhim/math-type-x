// Screenshot the reference playground tabs at DSF 1 (and 2) for visual comparison.
const { open } = require('./lib');
(async () => {
  const dsf = parseInt(process.env.DSF || '1', 10);
  const { b, p } = await open({ dsf });
  const box = await p.locator('#editorContainer').boundingBox();
  console.log('box', JSON.stringify(box));
  const out = process.env.OUT || 'ref-shots';
  await p.screenshot({ path: `${out}/ref_tab0_dsf${dsf}.png`, clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  const tabs = p.locator('#editorContainer .wrs_header button');
  const n = await tabs.count();
  console.log('tabs', n);
  for (let i = 1; i < n; i++) {
    await tabs.nth(i).click();
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/ref_tab${i}_dsf${dsf}.png`, clip: { x: box.x, y: box.y, width: box.width, height: 130 } });
  }
  await b.close();
})();
