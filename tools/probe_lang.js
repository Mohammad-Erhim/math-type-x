// Probe the reference editor with a different UI language: node tools/probe_lang.js ar
// Creates a second editor with language=<lang> on the reference page and dumps its toolbar (titles, dir, classes).
const { open } = require('./lib.js');
const fs = require('fs');
const lang = process.argv[2] || 'ar';
(async () => {
  const { b, p, log } = await open();
  const info = await p.evaluate(() => {
    const e = window.editor;
    return { keys: Object.keys(e).slice(0, 30), proto: Object.getOwnPropertyNames(Object.getPrototypeOf(e)).slice(0, 60) };
  });
  console.log(JSON.stringify(info));
  const before = log.net.length;
  await p.evaluate(async (lang) => {
    const d = document.createElement('div');
    d.id = 'langHost';
    d.style.cssText = 'width:725px;height:415px;position:relative;margin:20px';
    document.querySelector('#editorContainer').parentElement.appendChild(d);
    const ed = com.wiris.jsEditor.JsEditor.newInstance({ language: lang });
    ed.insertInto(d);
    window.edLang = ed;
  }, lang);
  await p.waitForTimeout(6000);
  const out = await p.evaluate(() => {
    const host = document.getElementById('langHost');
    const q = (s) => Array.from(host.querySelectorAll(s));
    return {
      rootClass: host.firstElementChild && host.firstElementChild.className,
      dir: getComputedStyle(host.firstElementChild || host).direction,
      tabs: q('.wrs_tabs button, .wrs_tab').slice(0, 12).map((e) => [e.title, e.getAttribute('aria-label'), e.className]),
      buttons: q('button').slice(0, 400).map((e) => [e.title, e.getAttribute('aria-label'), e.textContent.trim().slice(0, 30)]),
      selects: q('select').map((s) => Array.from(s.options).map((o) => o.textContent)),
      texts: q('*').filter((e) => e.children.length === 0 && e.textContent.trim()).map((e) => e.textContent.trim()).slice(0, 80),
    };
  });
  fs.writeFileSync(`evidence/ref_lang_${lang}.json`, JSON.stringify({ out, net: log.net.slice(before) }, null, 1));
  await p.locator('#langHost').screenshot({ path: `${process.env.S || '.'}/ref_lang_${lang}.png` });
  console.log('tabs', JSON.stringify(out.tabs).slice(0, 600));
  console.log('net', log.net.slice(before).slice(0, 15).join('\n'));
  await b.close();
})();
