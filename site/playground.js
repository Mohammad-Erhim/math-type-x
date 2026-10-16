// The live editor of the home page: loaded only when the visitor gets near it (or presses the button), so the page stays fast.
(function () {
  var box = document.getElementById('playground');
  if (!box) return;
  var cfg = window.MTX_PAGE;
  var lang = box.getAttribute('data-lang') || 'en';
  var ar = lang === 'ar';
  var load = document.getElementById('pgLoad');
  var host = document.getElementById('pgEditor');
  var png = document.getElementById('pgPng');
  var copy = document.getElementById('pgCopy');
  var full = document.getElementById('pgFull');
  var status = document.getElementById('pgStatus');
  var started = false;
  var editor = null;
  var T = ar
    ? { saved: 'تم تنزيل الصورة', copied: 'تم نسخ الصورة', fail: 'تعذّر إنشاء الصورة. أضف شيئًا إلى المعادلة أولًا.', empty: 'اكتب معادلة أولًا' }
    : { saved: 'Image downloaded', copied: 'Image copied', fail: 'Could not make the image. Add something to the equation first.', empty: 'Type an equation first' };
  var say = function (m) { status.textContent = m; clearTimeout(say.t); say.t = setTimeout(function () { status.textContent = ''; }, 4000); };

  function start() {
    if (started) return;
    started = true;
    var s = document.createElement('script');
    s.src = cfg.editorSrc;
    s.async = true;
    s.onload = function () {
      editor = MathTypeX.JsEditor.newInstance({ language: lang, layout: 'auto', services: { local: true }, persist: '', detectHand: false });
      editor.insertInto(host);
      load.hidden = true;
      png.disabled = false;
      png.hidden = false;
      if (navigator.clipboard && window.ClipboardItem) copy.hidden = false;
      window.mtxPlayground = editor;
    };
    s.onerror = function () { started = false; say(ar ? 'تعذّر تحميل المحرر. جرّب المحرر الكامل.' : 'The editor could not load. Try the full editor.'); };
    document.head.appendChild(s);
  }
  document.getElementById('pgStartBtn').addEventListener('click', start);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e, o) { if (e[0].isIntersecting) { start(); o.disconnect(); } }, { rootMargin: '500px 0px' }).observe(box);
  }
  // the ready-made examples
  box.querySelectorAll('[data-ex]').forEach(function (b) {
    b.addEventListener('click', function () {
      start();
      var key = b.getAttribute('data-ex');
      var go = function () {
        if (!editor) return setTimeout(go, 150);
        editor.setMathML(key === 'clear' ? '<math xmlns="http://www.w3.org/1998/Math/MathML"/>' : cfg.examples[key]);
        editor.focus();
      };
      go();
    });
  });
  function pngBlob() {
    if (!editor || editor.isEmpty()) { say(T.empty); return Promise.reject(); }
    return editor.getPNG({ zoom: 2, background: '#ffffff' });
  }
  png.addEventListener('click', function () {
    pngBlob().then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'equation.png';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      say(T.saved);
    }).catch(function (e) { if (e !== undefined) say(T.fail); });
  });
  copy.addEventListener('click', function () {
    pngBlob().then(function (blob) {
      return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    }).then(function () { say(T.copied); }).catch(function (e) { if (e !== undefined) say(T.fail); });
  });
  // "continue in the full editor": the formula goes along
  full.addEventListener('click', function () {
    try { if (editor && !editor.isEmpty()) localStorage.setItem('mtx:handoff', editor.getMathML()); } catch (e) {}
  });
})();
