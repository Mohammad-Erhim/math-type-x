// The full-page editor (/editor/ and /ar/editor/): the editor fills the window; its output panel is under it.
(function () {
  var cfg = window.MTX_PAGE || {};
  var q = new URLSearchParams(location.search);
  var lang = q.get('lang') || cfg.lang || 'en';
  // no server on a static host: the editor does its images and conversions itself
  var opts = { language: lang, layout: 'fluid', services: { local: true }, persist: q.get('persist') === '0' ? '' : 'mathtypex', detectHand: false };
  var root = document.documentElement;
  var vv = window.visualViewport;
  var base = 0; // tallest height seen: the window without the on-screen keyboard
  var fit = function () {
    var h = vv && vv.scale <= 1.02 ? vv.height : window.innerHeight;
    if (h > base) base = h;
    // on-screen keyboard open (phone, short viewport): hide the top bar so the editor gets the room
    var kbd = base - h > 120 && window.matchMedia('(max-width:724px),(max-height:480px)').matches;
    root.classList.toggle('kbd', kbd);
    if (h > 0) root.style.setProperty('--app-h', Math.round(h) + 'px');
    // the visible area may have been panned down by the keyboard: the page follows it, so no blank area shows below
    var top = vv && vv.scale <= 1.02 ? Math.max(0, Math.round(vv.offsetTop)) : 0;
    root.style.setProperty('--vv-top', top + 'px');
    if (window.scrollY || window.scrollX) window.scrollTo(0, 0);
  };
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', function () { base = 0; fit(); });
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
  // phones: the language switch and the home link live in the same bottom row as the export bar (no top bar, more room for the text)
  var dock = document.createElement('div');
  dock.className = 'mtx_dock';
  var lang2 = document.createElement('a');
  lang2.className = 'mtx_lang';
  lang2.href = cfg.other || '#';
  lang2.setAttribute('hreflang', cfg.otherLang || '');
  lang2.lang = cfg.otherLang || '';
  lang2.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>';
  lang2.appendChild(document.createTextNode(cfg.otherLabel || ''));
  var home = document.createElement('a');
  home.className = 'mtx_home';
  home.href = cfg.home || '/';
  home.setAttribute('aria-label', 'MathTypeX');
  home.innerHTML = '<img alt="" width="24" height="24">';
  home.firstChild.src = cfg.icon || '';
  // installable (the browser offered it): a small install button next to the logo
  var inst = document.createElement('button');
  inst.type = 'button';
  inst.className = 'mtx_install';
  inst.setAttribute('data-install', '');
  inst.setAttribute('aria-label', ar ? 'تثبيت التطبيق' : 'Install app');
  inst.title = ar ? 'تثبيت التطبيق' : 'Install app';
  inst.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14"/></svg>';
  dock.append(lang2, bar, inst, home);
  outBox.appendChild(dock);
  // leaving by mistake (the logo and the language switch sit next to the keyboard): ask first, when there is a formula
  var txt = ar
    ? { home: 'مغادرة المحرر؟', lang: 'تبديل اللغة؟', saved: 'معادلتك محفوظة على هذا الجهاز.', lost: 'ستفقد معادلتك.', stay: 'البقاء', goHome: 'مغادرة', goLang: 'تبديل' }
    : { home: 'Leave the editor?', lang: 'Switch language?', saved: 'Your equation is saved on this device.', lost: 'Your equation will be lost.', stay: 'Stay', goHome: 'Leave', goLang: 'Switch' };
  var dlg = document.createElement('dialog');
  dlg.className = 'mtx_leave';
  dlg.setAttribute('aria-labelledby', 'mtx-leave-t');
  dlg.innerHTML = '<h2 id="mtx-leave-t"></h2><p></p><div class="mtx_leaveBtns"><button type="button" class="mtx_stay"></button><button type="button" class="mtx_go"></button></div>';
  dlg.querySelector('.mtx_stay').textContent = txt.stay;
  document.body.appendChild(dlg);
  var target = '';
  var guard = function (a, kind) {
    a.addEventListener('click', function (e) {
      var empty = true;
      try { empty = editor.isEmpty(); } catch (err) {}
      if (empty || typeof dlg.showModal !== 'function') return;
      e.preventDefault();
      target = a.href;
      dlg.querySelector('h2').textContent = kind === 'lang' ? txt.lang : txt.home;
      dlg.querySelector('.mtx_go').textContent = kind === 'lang' ? txt.goLang : txt.goHome;
      var saved = false;
      try { saved = !!(editor.isPersisted && editor.isPersisted()); } catch (err) {}
      dlg.querySelector('p').textContent = saved ? txt.saved : txt.lost;
      dlg.showModal();
      dlg.querySelector('.mtx_stay').focus();
    });
  };
  guard(lang2, 'lang');
  guard(home, 'home');
  dlg.querySelector('.mtx_stay').addEventListener('click', function () { dlg.close(); });
  dlg.querySelector('.mtx_go').addEventListener('click', function () { dlg.close(); location.href = target; });
  // a tap on the dim area around the card closes it too
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (!t || !t.classList || !t.classList.contains('wrs_focusElement') || t.inputMode === 'none') return;
    if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return;
    if (outBox.classList.contains('mtx_open')) setOpen(false, true);
  });
  // the last update, in the visitor's own time zone
  try {
    var up = document.querySelector('time.upd[datetime]');
    if (up) {
      var when = new Date(up.getAttribute('datetime'));
      up.textContent = (up.getAttribute('data-label') || '') + new Intl.DateTimeFormat(ar ? 'ar' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(when);
      up.title = when.toString();
    }
  } catch (err) {}
})();
