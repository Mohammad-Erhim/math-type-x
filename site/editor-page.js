// The full-page editor (/editor/ and /ar/editor/): the editor fills the window; its output panel is under it.
(function () {
  var cfg = window.MTX_PAGE || {};
  var q = new URLSearchParams(location.search);
  var lang = q.get('lang') || cfg.lang || 'en';
  // no server on a static host: the editor does its images and conversions itself
  var opts = { language: lang, layout: 'fluid', services: { local: true }, persist: q.get('persist') === '0' ? '' : 'mathtypex', detectHand: false };
  var root = document.documentElement;
  var vv = window.visualViewport;
  var fit = function () {
    var h = vv && vv.scale <= 1.02 ? vv.height : window.innerHeight;
    if (h > 0) root.style.setProperty('--app-h', Math.round(h) + 'px');
    if (window.scrollY || window.scrollX) window.scrollTo(0, 0);
  };
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  if (vv) {
    vv.addEventListener('resize', fit);
    vv.addEventListener('scroll', fit);
  }
  var editor = MathTypeX.JsEditor.newInstance(opts);
  window.editor = editor;
  editor.insertInto(document.getElementById('editorContainer'));
  // a formula started in the playground of the home page continues here
  try {
    var pending = localStorage.getItem('mtx:handoff');
    if (pending) {
      localStorage.removeItem('mtx:handoff');
      editor.on('ready', function () { editor.setMathML(pending); });
      setTimeout(function () { try { if (editor.isEmpty()) editor.setMathML(pending); } catch (e) {} }, 600);
    }
  } catch (e) {}
  var outBox = document.getElementById('outputContainer');
  window.outputPanel = new MathTypeX.OutputPanel(editor, outBox);
  // phones: the export section is folded away behind a bar at the bottom
  var ar = /^ar/i.test(lang);
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
    if (open) {
      if (editor.closeKeyboard) editor.closeKeyboard();
      var a = document.activeElement;
      if (a && a.classList && a.classList.contains('wrs_focusElement')) a.blur();
    }
    setOpen(open);
  });
  outBox.appendChild(bar);
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (!t || !t.classList || !t.classList.contains('wrs_focusElement') || t.inputMode === 'none') return;
    if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return;
    if (outBox.classList.contains('mtx_open')) setOpen(false, true);
  });
})();
