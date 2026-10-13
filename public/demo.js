(function () {
  var q = new URLSearchParams(location.search);
  var opts = { language: q.get('lang') || 'en', services: { baseUrl: '/editor-services/' } };
  // the reference symbol fonts are loaded from the vendor CDN (cross-origin enabled); ?fonts=local keeps the bundled STIX Two Math
  if (q.get('fonts') !== 'local') opts.fontsUrl = 'https://www.wiris.net/demo/editor/resources/fonts/';
  if (q.has('toolbarSize')) opts.toolbarSize = parseFloat(q.get('toolbarSize'));
  if (q.has('autoformat')) opts.autoformat = q.get('autoformat') === 'true';
  if (q.has('detectHand')) opts.detectHand = q.get('detectHand') !== 'false';
  if (q.has('fontStyle')) opts.fontStyle = q.get('fontStyle');
  if (q.has('parity')) opts.parity = q.get('parity');
  // the host page follows the language of the editor (right-to-left for Arabic)
  var AR = { title: 'شاهد MathType أثناء العمل!', lead: 'جرّب المحرر أدناه: استخدم شريط الأدوات أو اكتب بلوحة المفاتيح أو انتقل إلى وضع الكتابة بخط اليد.' };
  if (/^ar/i.test(opts.language)) {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    var h1 = document.querySelector('h1');
    var lead = document.querySelector('.lead');
    if (h1) h1.textContent = AR.title;
    if (lead) lead.textContent = AR.lead;
    document.title = AR.title;
  } else if (opts.language) document.documentElement.lang = opts.language;
  var editor = com.wiris.jsEditor.JsEditor.newInstance(opts);
  window.editor = editor;
  editor.insertInto(document.getElementById('editorContainer'));
  // full screen: the whole window for the editor (the Fullscreen API where it exists, a CSS fallback elsewhere, e.g. iPhone)
  var fs = document.getElementById('fsBtn');
  function setFs(on) {
    document.documentElement.classList.toggle('fs', on);
    if (fs) {
      fs.setAttribute('aria-pressed', String(on));
      var label = on ? 'Exit full screen' : 'Full screen';
      fs.title = label;
      fs.setAttribute('aria-label', label);
      var span = fs.querySelector('.fslabel');
      if (span) span.textContent = label;
    }
    editor.setLayout(on ? 'fluid' : 'auto');
  }
  if (fs) {
    fs.addEventListener('click', function () {
      var on = !document.documentElement.classList.contains('fs');
      setFs(on);
      var d = document;
      try {
        if (on && d.documentElement.requestFullscreen && !d.fullscreenElement) d.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(function () {});
        else if (!on && d.fullscreenElement && d.exitFullscreen) d.exitFullscreen().catch(function () {});
      } catch (e) {}
    });
    // leaving the browser's full screen (Esc) leaves ours too
    document.addEventListener('fullscreenchange', function () {
      if (!document.fullscreenElement && document.documentElement.classList.contains('fs')) setFs(false);
    });
  }
  if (q.get('output') !== '0') window.outputPanel = new MathTypeX.OutputPanel(editor, document.getElementById('outputContainer'));
})();
