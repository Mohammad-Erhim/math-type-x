(function () {
  var q = new URLSearchParams(location.search);
  // the editor fills the space the page gives it (the window height, minus the output panel)
  var opts = { language: q.get('lang') || 'en', layout: 'fluid', services: { baseUrl: '/editor-services/' }, persist: q.get('persist') === '0' ? '' : 'mathtypex' };
  // ?layout=classic: the fixed 725 x 415 widget (used by the test tools, whose coordinates assume it)
  if (q.get('layout') === 'classic') {
    opts.layout = 'classic';
    document.documentElement.classList.add('classic');
  }
  if (q.has('toolbarSize')) opts.toolbarSize = parseFloat(q.get('toolbarSize'));
  if (q.has('autoformat')) opts.autoformat = q.get('autoformat') === 'true';
  // handwriting is switched off for now (?detectHand=true brings it back)
  opts.detectHand = q.get('detectHand') === 'true';
  if (q.has('fontStyle')) opts.fontStyle = q.get('fontStyle');
  if (q.has('parity')) opts.parity = q.get('parity');
  // the host page follows the language of the editor (right-to-left for Arabic)
  var AR = { title: 'محرر المعادلات math-type-x', lead: 'جرّب المحرر أدناه: استخدم شريط الأدوات أو اكتب بلوحة المفاتيح أو انتقل إلى وضع الكتابة بخط اليد.' };
  if (/^ar/i.test(opts.language)) {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    var h1 = document.querySelector('h1');
    var lead = document.querySelector('.lead');
    if (h1) h1.textContent = AR.title;
    if (lead) lead.textContent = AR.lead;
    document.title = AR.title;
  } else if (opts.language) document.documentElement.lang = opts.language;
  var editor = MathTypeX.JsEditor.newInstance(opts);
  window.editor = editor;
  editor.insertInto(document.getElementById('editorContainer'));
  // the formula, the tab, the font … are kept in the browser (local storage): leaving the page loses nothing, so there is
  // no confirmation. Only when nothing can be kept (storage blocked, ?persist=0) a formula in the editor is guarded.
  window.addEventListener('beforeunload', function (e) {
    var guard = false;
    try {
      guard = !editor.isEmpty() && !editor.isPersisted();
    } catch (err) {}
    if (!guard) return;
    e.preventDefault();
    e.returnValue = '';
  });
})();
