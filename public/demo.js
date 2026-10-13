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
  if (q.get('output') !== '0') {
    var outBox = document.getElementById('outputContainer');
    window.outputPanel = new MathTypeX.OutputPanel(editor, outBox);
    // which build this page is (so a page opened before a release is easy to tell from a new one)
    try {
      var src = (document.currentScript && document.currentScript.src) || (document.querySelector('script[src*="demo.js"]') || {}).src || '';
      var stamp = /[?&]v=(\d+)/.exec(src);
      var foot = outBox.querySelector('.mtx_status');
      if (stamp && foot) {
        var d = new Date(parseInt(stamp[1], 10));
        var pad = function (n) { return (n < 10 ? '0' : '') + n; };
        foot.title = 'build ' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        var tag = document.createElement('span');
        tag.className = 'mtx_build';
        tag.textContent = 'build ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        foot.parentNode.insertBefore(tag, foot);
      }
    } catch (err) {}
    // phones: the export section is folded away behind a bar at the bottom (more room for the formula); on larger
    // screens it is always shown. The choice is remembered.
    var ar = /^ar/i.test(opts.language);
    var bar = document.createElement('button');
    bar.type = 'button';
    bar.className = 'mtx_exportBar';
    bar.setAttribute('aria-controls', 'outputContainer');
    var label = ar ? 'تصدير' : 'Export';
    var setOpen = function (open, keep) {
      outBox.classList.toggle('mtx_open', open);
      bar.setAttribute('aria-expanded', String(open));
      bar.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 11l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform-origin:9px 9px;transform:rotate(' + (open ? 180 : 0) + 'deg)"/></svg><span>' + label + '</span>';
      if (!keep) {
        try { localStorage.setItem('mtx:exportOpen', open ? '1' : '0'); } catch (err) {}
      }
    };
    var was = false;
    try { was = localStorage.getItem('mtx:exportOpen') === '1'; } catch (err) {}
    setOpen(was, true);
    bar.addEventListener('click', function () {
      var open = !outBox.classList.contains('mtx_open');
      // opening the export section puts the phone's keyboard away
      if (open) {
        var a = document.activeElement;
        if (a && a.classList && a.classList.contains('wrs_focusElement')) a.blur();
      }
      setOpen(open);
    });
    outBox.appendChild(bar);
    // the phone's keyboard takes half of the screen: the export section folds away when it opens (the choice made with the
    // bar is not changed – it is back when the keyboard is put away and the page is opened again)
    document.addEventListener('focusin', function (e) {
      var t = e.target;
      if (!t || !t.classList || !t.classList.contains('wrs_focusElement') || t.inputMode === 'none') return;
      if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return;
      if (outBox.classList.contains('mtx_open')) setOpen(false, true);
    });
  }
})();
