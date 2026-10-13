const { scenario } = require('./sc');
scenario('s12_modes', async (H) => {
  const { p } = H;
  const st = async () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#editorContainer button.wrs_button')].filter(b => b.getBoundingClientRect().width > 0 && /Bold|Italic|Automatic italic|Regular text|Right to left|Arabic ligature/.test(b.title)).map(b => [b.title, [...b.classList].filter(c => /toggled|pressed|disabled/.test(c)).join(',') || 'normal'])));
  const fresh = async () => { await H.reset(); await H.focusEdit(); };
  // RTL
  await H.step('RTL: click "Right to left editing" on empty editor', async () => { await fresh(); await H.click('Right to left editing'); }, { clip: 'full', extra: st });
  await H.step('RTL: type "abc"', async () => { await p.keyboard.type('abc'); }, { clip: 'full', extra: st });
  await H.step('RTL: ArrowLeft once (caret direction)', async () => { await p.keyboard.press('ArrowLeft'); await p.keyboard.type('X'); }, { clip: 'full' });
  await H.step('RTL: insert fraction then type "1"', async () => { await H.click('Fraction (Ctrl+/)'); await p.keyboard.type('1'); }, { clip: 'full' });
  await H.step('RTL: type Arabic letters via insertText', async () => { await fresh(); await p.keyboard.insertText('مرحبا'); }, { clip: 'full' });
  await H.step('RTL: type digits 123 and operators 1+2', async () => { await fresh(); await p.keyboard.type('1+2=3'); }, { clip: 'full' });
  await H.step('RTL toggled OFF again', async () => { await H.click('Right to left editing'); await p.keyboard.type('q'); }, { clip: 'full', extra: st });
  // Arabic ligature
  await H.step('Arabic ligature: click button on empty editor', async () => { await fresh(); await H.click('Arabic ligature'); }, { clip: 'full', extra: st });
  await H.step('Arabic ligature: type Arabic text "سمع"', async () => { await p.keyboard.insertText('سمع'); }, { clip: 'full', extra: st });
  await H.step('Arabic ligature toggled off', async () => { await H.click('Arabic ligature'); await p.keyboard.insertText('سمع'); }, { clip: 'full', extra: st });
  // automatic italic off & other buttons
  await H.step('Automatic italic OFF then click Greek tab > Alpha', async () => { await fresh(); await H.click('Automatic italic'); await H.tab(3); await H.click('Alpha'); }, { clip: 'full', extra: st });
  await H.step('Automatic italic OFF then Number pi (General tab)', async () => { await H.tab(0); await H.click('Number pi'); await p.keyboard.type('x'); }, { clip: 'full' });
  await H.step('Automatic italic OFF + bold: type "ab"', async () => { await H.click('Bold (Ctrl+B)'); await p.keyboard.type('ab'); }, { clip: 'full', extra: st });
  await H.step('Italic ON + typed digits and letters', async () => { await fresh(); await H.click('Italic (Ctrl+I)'); await p.keyboard.type('x2'); }, { clip: 'full', extra: st });
  await H.step('Bold ON then insert Fraction and type "ab" and click Greek Beta', async () => { await fresh(); await H.click('Bold (Ctrl+B)'); await H.click('Fraction (Ctrl+/)'); await p.keyboard.type('a'); await p.keyboard.press('ArrowDown'); await p.keyboard.type('b'); }, { clip: 'full', extra: st });
  await H.step('Regular text ON then click Fraction', async () => { await fresh(); await H.click('Regular text'); await H.click('Fraction (Ctrl+/)'); await p.keyboard.type('hi'); }, { clip: 'full', extra: st });
  await H.step('Regular text ON then Alpha (Greek tab)', async () => { await fresh(); await H.click('Regular text'); await H.tab(3); await H.click('Alpha'); await p.keyboard.type(' text'); }, { clip: 'full', extra: st });
  await H.step('Color red chosen then insert Fraction and type', async () => { await fresh(); await H.tab(0); await H.click('Color'); await p.locator('.wrs_colorButton').first().click(); await H.click('Fraction (Ctrl+/)'); await p.keyboard.type('a'); await p.keyboard.press('ArrowDown'); await p.keyboard.type('b'); }, { clip: 'full' });
  await H.step('Font size 36px selected then type "ab" then Fraction', async () => { await fresh(); await p.locator('#editorContainer select[title="Font size"]').selectOption('36px'); await H.sleep(500); await p.keyboard.type('ab'); await H.click('Fraction (Ctrl+/)'); }, { clip: 'full' });
  await H.step('Font Courier New then Square root', async () => { await fresh(); await p.locator('#editorContainer select[title="Font family"]').selectOption('Courier New'); await H.sleep(500); await p.keyboard.type('x'); await H.click('Square root'); await p.keyboard.type('y'); }, { clip: 'full' });
  // Bold with different symbol buttons
  await H.step('Select "x+1" and apply bold: operators and numbers', async () => { await fresh(); await p.keyboard.type('x+1'); await p.keyboard.press('Control+a'); await H.click('Bold (Ctrl+B)'); }, { clip: 'full' });
  await H.step('Select fraction content and apply Italic', async () => { await fresh(); await H.click('Fraction (Ctrl+/)'); await p.keyboard.type('12'); await p.keyboard.press('Control+a'); await H.click('Italic (Ctrl+I)'); }, { clip: 'full' });
}, {});
