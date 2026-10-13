const { scenario } = require('./sc');
scenario('s16_elementary', async (H) => {
  const { p } = H;
  const fresh = async () => { await H.reset(); await H.focusEdit(); };
  const ctl = async () => p.evaluate(() => [...document.querySelectorAll('#editorContainer .wrs_toolbar button, #editorContainer .wrs_toolbar select, #editorContainer .wrs_toolbar input')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.wrs_header') && !/Math input|handwritten/.test(e.title || e.getAttribute('aria-label') || ''); }).map(e => (e.title || e.getAttribute('aria-label')) + (e.classList.contains('wrs_disabled') ? ' [disabled]' : '') + (e.classList.contains('wrs_toggle') ? ' [toggle]' : '')));
  const openMore = async () => { await H.tab(4); await p.locator('#editorContainer .wrs_expandButton:visible').first().click(); await H.sleep(400); };
  const items = ['3 rows stack with line and plus sign', '3 rows stack with line', '3 rows stack with line and minus sign', '3 rows stack with line and multiplication sign', 'Long division (used in the United States, Great Britain, and elsewhere)', 'Long division (used in Spain, Brazil and elsewhere)', 'Long division with remainder (used in Spain, Brazil and elsewhere)', 'Long division with remainder (used in the United States, Great Britain, and elsewhere)'];
  for (const it of items) {
    await H.step(`Insert "${it}" on empty editor`, async () => { await fresh(); await H.tab(4); const direct = p.locator(`#editorContainer button[title="${it}"]:visible`); if (await direct.count()) await direct.first().click(); else { await openMore(); await p.locator(`#editorContainer button[title="${it}"]:visible`).first().click(); } await H.sleep(500); }, { clip: 'full' });
    await H.step(`  → type "12" in first slot`, async () => { await p.keyboard.type('12'); }, { clip: 'full' });
    await H.step(`  → Contextual tab controls for this structure`, async () => { await H.tab(9); await H.sleep(400); }, { clip: 'full', noMathml: true, extra: ctl });
  }
  // stack: Enter / Space / carries
  await H.step('Stack: insert 3-row stack and type 12, Enter, 34', async () => { await fresh(); await H.tab(4); await H.click('3 rows stack with line and plus sign'); await p.keyboard.type('12'); await p.keyboard.press('Enter'); await p.keyboard.type('34'); }, { clip: 'full' });
  await H.step('Stack: Enter again adds row?', async () => { await p.keyboard.press('Enter'); await p.keyboard.type('5'); }, { clip: 'full' });
  await H.step('Stack: Space adds indentation', async () => { await p.keyboard.press('Space'); await p.keyboard.type('6'); }, { clip: 'full' });
  await H.step('Stack: Contextual → Insert carries in this row', async () => { await H.tab(9); await H.click('Insert carries in this row'); }, { clip: 'full', extra: ctl });
  for (const t of ['Set carries location at north-west', 'Set carries location at north', 'Set carries location at north-east', 'Set carries location at west', 'Set carries location at east', 'Set carries location at south-west', 'Set carries location at south', 'Set carries location at south-east']) {
    await H.step(`Stack carries → ${t}`, async () => { await H.click(t); }, { clip: 'full' });
  }
  await H.step('Stack: Prepend row', async () => { await H.click('Prepend row'); }, { clip: 'full' });
  await H.step('Stack: Append row', async () => { await H.click('Append row'); }, { clip: 'full' });
  await H.step('Stack: Insert line', async () => { await H.click('Insert line'); }, { clip: 'full' });
  await H.step('Stack: Move to right', async () => { await H.click('Move to right'); }, { clip: 'full' });
  await H.step('Stack: Move to left', async () => { await H.click('Move to left'); }, { clip: 'full' });
  await H.step('Stack: Spacing between digits 15px', async () => { await p.locator('#editorContainer select[title="Spacing between digits"]').selectOption('15px'); await H.sleep(400); }, { clip: 'full' });
  await H.step('Stack: Up diagonal strike (with a digit selected)', async () => { await H.focusEdit(); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('Shift+ArrowLeft'); await H.tab(9); await H.click('Up diagonal strike'); }, { clip: 'full' });
}, {});
