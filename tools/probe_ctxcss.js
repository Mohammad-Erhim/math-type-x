const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p.goto('https://www.wiris.com/en/mathtype/', { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter{display:none !important}' });
  await p.waitForFunction(() => window.editor && document.querySelector('#editorContainer .wrs_toolbar button.wrs_button'), null, { timeout: 60000 });
  const NS = 'xmlns="http://www.w3.org/1998/Math/MathML"';
  const rp = p.waitForResponse((r) => /mathml2internal/.test(r.url()), { timeout: 8000 }).catch(() => null);
  await p.evaluate((m) => editor.setMathML(m), `<math ${NS}><mfenced><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></mfenced></math>`);
  await rp; await p.waitForTimeout(1000);
  const bx = await p.locator('#editorContainer').boundingBox();
  await p.mouse.click(bx.x + 600, bx.y + 330); await p.waitForTimeout(300);
  await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft');
  await p.locator('#editorContainer .wrs_header button').nth(9).click(); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const q = (sel) => document.querySelector('#editorContainer ' + sel);
    const props = ['fontFamily','fontSize','fontWeight','color','lineHeight','padding','margin','height','width','boxSizing','display','overflow','textAlign','verticalAlign','position','left','top','background','border','borderRadius','cursor','opacity','whiteSpace','letterSpacing'];
    const cs = (el) => { if (!el) return null; const c = getComputedStyle(el); const o = {}; props.forEach((k) => (o[k] = c[k])); return o; };
    return {
      wrap: cs(q('.wrs_multipleRowPanel .wrs_select')), label: cs(q('.wrs_multipleRowPanel .wrs_label')), sel: cs(q('.wrs_multipleRowPanel select')),
      line: cs(q('.wrs_multipleRowPanel .wrs_line')), btn22: cs(q('.wrs_multipleRowPanel button[title="Align with axis"]')), btn33: cs(q('.wrs_multipleRowPanel button[title="Baseline"]')),
      td: cs(q('.wrs_multipleRowPanel td')), table: cs(q('.wrs_multipleRowPanel table')), empty: cs(q('.wrs_multipleRowPanel .wrs_empty')), panel: cs(q('.wrs_multipleRowPanel')),
      img: cs(q('.wrs_multipleRowPanel button[title="Baseline"] img')),
      html: q('.wrs_multipleRowPanel').innerHTML.slice(0, 1800),
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
