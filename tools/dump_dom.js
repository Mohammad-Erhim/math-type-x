// Dump the reference editor DOM (outerHTML) and stylesheet info for structural parity.
const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ dsf: 1 });
  const html = await p.evaluate(() => document.querySelector('#editorContainer').outerHTML);
  fs.writeFileSync(process.argv[2] || '/tmp/ref_dom.html', html);
  console.log('html bytes', html.length);
  await b.close();
})();
