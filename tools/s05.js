const { scenario } = require('./sc');
scenario('s05_format', async (H) => {
  const { p } = H;
  const typeSel = async (s, back) => {
    for (let attempt = 0; attempt < 4; attempt++) {
      await H.reset(); await H.sleep(300); await H.focusEdit(); await p.keyboard.type(s); await H.sleep(300);
      const m = await H.mml(); const letters = s.replace(/[^A-Za-z0-9]/g, '');
      if (letters.split('').every(ch => m.includes('>' + ch) || m.includes(ch + '<'))) break;
    }
    for (let i = 0; i < (back || s.length); i++) await p.keyboard.press('Shift+ArrowLeft');
    await H.sleep(250);
  };
  const btnState = async () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#editorContainer button.wrs_button')].filter(b => b.getBoundingClientRect().width > 0 && /Bold|Italic|Automatic italic|Regular text|Right to left|Arabic ligature|Color|special/.test(b.title)).map(b => [b.title, [...b.classList].filter(c => /toggled|pressed|disabled/.test(c)).join(',') || 'normal'])));
  // BOLD
  await H.step('Bold: type "xy", select both, click Bold', async () => { await typeSel('xy'); await H.click('Bold (Ctrl+B)'); }, { extra: btnState });
  await H.step('Bold: click Bold again on same selection (toggle off)', async () => { await H.click('Bold (Ctrl+B)'); }, { extra: btnState });
  await H.step('Bold with no selection: click Bold then type "ab"', async () => { await H.reset(); await H.focusEdit(); await H.click('Bold (Ctrl+B)'); await p.keyboard.type('ab'); }, { extra: btnState });
  await H.step('Bold: Ctrl+B shortcut with selection', async () => { await typeSel('xy'); await p.keyboard.press('Control+b'); }, { extra: btnState });
  await H.step('Bold on number 123 selected', async () => { await typeSel('123'); await H.click('Bold (Ctrl+B)'); });
  // ITALIC
  await H.step('Italic: type "123", select, click Italic (numbers become italic)', async () => { await typeSel('123'); await H.click('Italic (Ctrl+I)'); }, { extra: btnState });
  await H.step('Italic: Ctrl+I shortcut on "sin" selection', async () => { await typeSel('sin'); await p.keyboard.press('Control+i'); });
  await H.step('Italic with no selection then type "a1"', async () => { await H.reset(); await H.focusEdit(); await H.click('Italic (Ctrl+I)'); await p.keyboard.type('a1'); }, { extra: btnState });
  // AUTOMATIC ITALIC
  await H.step('Automatic italic ON (default): type "xsin1"', async () => { await H.reset(); await H.focusEdit(); await p.keyboard.type('xsin1'); }, { extra: btnState });
  await H.step('Toggle Automatic italic OFF then type "xsin1"', async () => { await H.reset(); await H.focusEdit(); await H.click('Automatic italic'); await p.keyboard.type('xsin1'); }, { extra: btnState });
  await H.step('Automatic italic OFF then click it again (ON) and type "xy"', async () => { await H.click('Automatic italic'); await p.keyboard.type('xy'); }, { extra: btnState });
  // REGULAR TEXT
  await H.step('Regular text: click button then type "hello world"', async () => { await H.reset(); await H.focusEdit(); await H.click('Regular text'); await p.keyboard.type('hello world'); }, { extra: btnState });
  await H.step('Regular text: then ArrowRight and type "+1"', async () => { await p.keyboard.press('ArrowRight'); await p.keyboard.type('+1'); });
  await H.step('Regular text applied on selected "abc"', async () => { await typeSel('abc'); await H.click('Regular text'); }, { extra: btnState });
  await H.step('Regular text toggled off after typing (click twice then type "x")', async () => { await H.reset(); await H.focusEdit(); await H.click('Regular text'); await p.keyboard.type('a'); await H.click('Regular text'); await p.keyboard.type('x'); }, { extra: btnState });
  // COLOR
  await H.step('Color: open palette (select "xy" first)', async () => { await typeSel('xy'); await H.click('Color'); await H.sleep(500); }, { clip: 'full' });
  await H.step('Color: click first swatch (red) on selection', async () => { await p.locator('.wrs_colorButton').first().click(); await H.sleep(400); });
  await H.step('Color: open again and click 13th swatch', async () => { await H.click('Color'); await p.locator('.wrs_colorButton').nth(12).click(); await H.sleep(400); }, { clip: 'edit' });
  await H.step('Color: open and type custom hex #00AA55 + Enter', async () => { await typeSel('xy'); await H.click('Color'); const inp = p.locator('.wrs_colorChooserPanel input').first(); await inp.fill('#00AA55'); await inp.press('Enter'); await H.sleep(400); }, { clip: 'full' });
  await H.step('Color: invalid hex "zzz" + Enter', async () => { await typeSel('xy'); await H.click('Color'); const inp = p.locator('.wrs_colorChooserPanel input').first(); await inp.fill('zzz'); await inp.press('Enter'); await H.sleep(400); }, { clip: 'full' });
  await H.step('Color: hex without # "FF8800" + Enter', async () => { await typeSel('xy'); await H.click('Color'); const inp = p.locator('.wrs_colorChooserPanel input').first(); await inp.fill('FF8800'); await inp.press('Enter'); await H.sleep(400); }, { clip: 'full' });
  await H.step('Color: 3-digit hex "#f80" + Enter', async () => { await typeSel('xy'); await H.click('Color'); const inp = p.locator('.wrs_colorChooserPanel input').first(); await inp.fill('#f80'); await inp.press('Enter'); await H.sleep(400); }, { clip: 'full' });
  await H.step('Color: no selection, pick blue swatch then type "ab"', async () => { await H.reset(); await H.focusEdit(); await H.click('Color'); await p.locator('.wrs_colorButton').nth(2).click(); await H.sleep(300); await p.keyboard.type('ab'); });
  await H.step('Color: open palette then press Escape', async () => { await typeSel('xy'); await H.click('Color'); await p.keyboard.press('Escape'); await H.sleep(300); }, { clip: 'full' });
  await H.step('Color: open palette then click in editing area (outside)', async () => { await H.click('Color'); await H.focusEdit(); await H.sleep(300); }, { clip: 'full' });
  await H.step('Color: open palette then click Color again (toggle)', async () => { await typeSel('xy'); await H.click('Color'); await H.click('Color'); await H.sleep(300); }, { clip: 'full' });
  // FONT FAMILY / SIZE
  for (const f of ['Arial', 'stix', 'Courier New', 'Tahoma', 'Times New Roman', 'Verdana']) {
    await H.step(`Font family: select "${f}" on typed "xy" (selected)`, async () => { await typeSel('xy'); await p.locator('#editorContainer select[title="Font family"]').selectOption(f); await H.sleep(400); }, { extra: async () => p.evaluate(() => document.querySelector('#editorContainer select[title="Font family"]').value) });
  }
  for (const s of ['8px', '12px', '16px', '24px', '36px', '48px', '72px']) {
    await H.step(`Font size: select "${s}"`, async () => { await typeSel('xy'); await p.locator('#editorContainer select[title="Font size"]').selectOption(s); await H.sleep(400); }, { extra: async () => p.evaluate(() => document.querySelector('#editorContainer select[title="Font size"]').value) });
  }
  await H.step('Font size 72px then reset option to "— Size —"', async () => { await p.locator('#editorContainer select[title="Font size"]').selectOption('inherit'); await H.sleep(300); });
  await H.step('Font family with caret only (no selection) then type "ab"', async () => { await H.reset(); await H.focusEdit(); await p.locator('#editorContainer select[title="Font family"]').selectOption('Courier New'); await H.sleep(300); await p.keyboard.type('ab'); });
  await H.step('Font family applied then toolbar select shows value after new typing', null, { extra: async () => p.evaluate(() => ({ fam: document.querySelector('#editorContainer select[title="Font family"]').value, size: document.querySelector('#editorContainer select[title="Font size"]').value })) });
}, {});
