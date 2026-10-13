// Type Arabic / mixed content into the reference (language ar and en) -> evidence/ref_ar_typing.json
const fs = require('fs');
const { open } = require('./lib');
const EMPTY = '<math xmlns="http://www.w3.org/1998/Math/MathML"/>';
const seqs = [
  'ا', 'س', 'ص+س', 'اب', 'س=٣', '١٢٣', '١٢٫٥', '٣٫١٤', '١،٥', '٪', '٣٪', '؟', '؛', '،', 'ع=١٢', 'ن!',
  'س٢', 'ال', 'جا', 'جتا', 'ظا', 'لو', 'sin', 'sin س', 'x', 'x+١', 'a/b', 'س/ص', 'س^٢', 'س_١', '(س)', '[س]', '{س}', '|س|',
  '١+١=٢', 'ص=٢س+١', 'ك', 'ﺃ', 'ﻻ', 'لا', 'ـ', 'بَ', 'ـ', 'ٱ', 'ء', 'ئ', 'ة', 'ى', 'پ', 'چ', 'گ',
  'جا', 'ظا', 'ظتا', 'قتا', 'قا', 'لط', 'نها', 'لو', 'لوس', 'جاس', 'ت', 'جب', 'ظل', 'جيب', 'جتاس', 'ا ب', '٠', '۰۱۲۳', '۴۵۶', 'x ١', 'س ص', 'ab ا', '3.5', '3,5', '1٫5', 'عند', 'جذر', 'ط', 'ہ',
  '<', '>', '=', '*', '-', '−', '×', '÷', '٫', '٬', '،', '؛', '؟', '٪',
];
(async () => {
  const { b, p } = await open({ dsf: 1 });
  const out = {};
  for (const lang of ['ar', 'en']) {
    await p.evaluate((lang) => {
      const c = document.getElementById('editorContainer'); c.innerHTML = '';
      const ed = com.wiris.jsEditor.JsEditor.newInstance({ language: lang }); ed.insertInto(c); window.editor = ed;
    }, lang);
    await p.waitForTimeout(2500);
    const box = await p.locator('#editorContainer').boundingBox();
    out[lang] = {};
    for (const s of seqs) {
      await p.evaluate(({ m, lang }) => { window.editor.setMathML(lang === 'ar' ? m.replace('<math ', '<math dir="rtl" ') : m); }, { m: EMPTY, lang });
      await p.waitForTimeout(400);
      await p.mouse.click(box.x + 360, box.y + 300);
      await p.waitForTimeout(500);
      for (const ch of [...s]) { await p.keyboard.type(ch, { delay: 30 }); await p.waitForTimeout(60); }
      await p.waitForTimeout(350);
      out[lang][s] = await p.evaluate(() => window.editor.getMathML());
    }
    console.log(lang, Object.keys(out[lang]).length);
  }
  fs.writeFileSync('evidence/ref_ar_typing.json', JSON.stringify(out, null, 1));
  await b.close();
})();
