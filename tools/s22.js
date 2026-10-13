const { scenario } = require('./sc');
scenario('s22_swatches', async (H) => {
  const { p } = H;
  const n = 25;
  for (let i = 0; i < n; i++) {
    await H.step(`Colour swatch #${i + 1} (row ${Math.floor(i / 5) + 1}, col ${i % 5 + 1}) applied to selected "x"`, async () => { await H.reset(); await H.focusEdit(); await p.keyboard.type('x'); await p.keyboard.press('Shift+ArrowLeft'); await H.click('Color'); await H.sleep(250); await p.locator('.wrs_colorButton').nth(i).click(); await H.sleep(350); }, { clip: 'edit' });
  }
}, {});
