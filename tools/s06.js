const { scenario } = require('./sc');
scenario('s06_unicode', async (H) => {
  const { p } = H;
  const panel = '.wrs_unicodeChooserPanel';
  const open = async () => { await H.click('Insert special characters'); await H.sleep(700); };
  const info = await (async () => { await H.focusEdit(); await open(); return p.evaluate(() => { const pn = document.querySelector('.wrs_unicodeChooserPanel'); return { html: pn.innerHTML.replace(/<div class="wrs_unicodeButton[^>]*>[^<]*<\/div>/g, '').slice(0, 1500), inputs: [...pn.querySelectorAll('input,select')].map(e => e.tagName + '|' + e.type + '|' + e.className + '|' + e.title + '|' + (e.options ? [...e.options].map(o => o.value + '=' + o.text).join(',') : '')) }; }); })();
  console.log(JSON.stringify(info, null, 1));
  await H.step('Special characters panel opened (default category Symbol)', null, { clip: 'full' });
  const cats = await p.evaluate(() => { const s = document.querySelector('.wrs_unicodeChooserPanel select'); return s ? [...s.options].map(o => o.value) : []; });
  console.log('cats', cats);
  const cnt = async () => p.evaluate(() => document.querySelectorAll('.wrs_unicodeChooserPanel .wrs_unicodeButton').length);
  for (const c of cats) {
    await H.step(`Category "${c}"`, async () => { await p.locator('.wrs_unicodeChooserPanel select').selectOption(c); await H.sleep(600); }, { clip: 'full', noMathml: true, extra: async () => ({ chars: await cnt() }) });
  }
  await p.locator('.wrs_unicodeChooserPanel select').selectOption(cats[0]);
  await H.sleep(400);
  await H.step('Click the first character in the grid', async () => { await p.locator('.wrs_unicodeChooserPanel .wrs_unicodeButton').first().click(); await H.sleep(500); }, { clip: 'full', extra: async () => ({ panelVisible: await p.locator(panel).isVisible().catch(() => false) }) });
  await H.step('Reopen; click the 10th character (typed "ab" first)', async () => { await H.reset(); await H.focusEdit(); await p.keyboard.type('ab'); await open(); await p.locator('.wrs_unicodeChooserPanel .wrs_unicodeButton').nth(9).click(); await H.sleep(500); }, { clip: 'full' });
  const code = async (v, d) => H.step(`Code field: "${v}" ${d}`, async () => { await H.reset(); await H.focusEdit(); await open(); const i = p.locator('.wrs_unicodeChooserPanel input').first(); await i.fill(v); await H.sleep(700); }, { clip: 'full', noMathml: true, extra: async () => ({ chars: await cnt() }) });
  await code('210F', '(hex, reduced Planck constant)');
  await code('198', '(ambiguous hex/decimal)');
  await code('03B1', '(Greek alpha, leading zero)');
  await code('u+03b1', '(with U+ prefix, lowercase)');
  await code('zzzz', '(invalid)');
  await code('', '(empty)');
  await code('10FFFF', '(max code point)');
  await code('1F600', '(emoji)');
  await H.step('Code 210F then click first result to insert', async () => { await H.reset(); await H.focusEdit(); await open(); const i = p.locator('.wrs_unicodeChooserPanel input').first(); await i.fill('210F'); await H.sleep(700); await p.locator('.wrs_unicodeChooserPanel .wrs_unicodeButton').first().click(); await H.sleep(500); }, { clip: 'full' });
  await H.step('Code 210F, press Enter', async () => { await H.reset(); await H.focusEdit(); await open(); const i = p.locator('.wrs_unicodeChooserPanel input').first(); await i.fill('210F'); await i.press('Enter'); await H.sleep(500); }, { clip: 'full' });
  await H.step('Open panel with selection "x": click a char (replace?)', async () => { await H.reset(); await H.focusEdit(); await p.keyboard.type('x'); await p.keyboard.press('Shift+ArrowLeft'); await open(); await p.locator('.wrs_unicodeChooserPanel .wrs_unicodeButton').nth(3).click(); await H.sleep(500); }, { clip: 'full' });
  await H.step('Open panel then Escape', async () => { await H.focusEdit(); await open(); await p.keyboard.press('Escape'); await H.sleep(400); }, { clip: 'full', extra: async () => ({ panelVisible: await p.locator(panel).isVisible().catch(() => false) }) });
  await H.step('Open panel then click inside editing area', async () => { await open(); await H.focusEdit(); await H.sleep(400); }, { clip: 'full', extra: async () => ({ panelVisible: await p.locator(panel).isVisible().catch(() => false) }) });
  await H.step('Open panel then click the button again (toggle)', async () => { await open(); await H.click('Insert special characters'); await H.sleep(400); }, { clip: 'full', extra: async () => ({ panelVisible: await p.locator(panel).isVisible().catch(() => false) }) });
  await H.step('Open panel, scroll grid to bottom', async () => { await open(); await p.evaluate(() => { const c = document.querySelector('.wrs_unicodeChooserTableContainer'); c.scrollTop = c.scrollHeight; }); await H.sleep(500); }, { clip: 'full', noMathml: true });
}, {});
