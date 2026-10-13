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
  var editor = com.wiris.jsEditor.JsEditor.newInstance(opts);
  window.editor = editor;
  editor.insertInto(document.getElementById('editorContainer'));
  if (q.get('output') !== '0') window.outputPanel = new MathTypeX.OutputPanel(editor, document.getElementById('outputContainer'));
})();
