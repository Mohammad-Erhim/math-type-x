(function () {
  var q = new URLSearchParams(location.search);
  // the editor fills the space the page gives it (the window height, minus the output panel)
  var opts = { language: q.get('lang') || 'en', layout: 'fluid', services: { baseUrl: '/editor-services/' } };
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
  // leaving the page by mistake (a swipe back, a closed tab) would lose the formula: the browser asks first
  window.addEventListener('beforeunload', function (e) {
    var empty = true;
    try {
      empty = editor.isEmpty();
    } catch (err) {}
    if (empty) return;
    e.preventDefault();
    e.returnValue = '';
  });
  if (q.get('output') !== '0') window.outputPanel = new MathTypeX.OutputPanel(editor, document.getElementById('outputContainer'));
})();
