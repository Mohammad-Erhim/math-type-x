const fs = require('fs');
const L = require('./build_lib');
const { esc, loadJson, exists, M } = L;
const S = require('./srs_build');
const base = require('./srs_main');
const { st, prof, sp, H2 } = base;
let h = '';
const fontlist = ['Conv_a (letters/digits, stix_regular_letters_numbers)', 'Conv_math1 (symbols, stix_symbols), Conv_math1RTL (mirrored symbols for RTL)', 'Conv_horizontal (horizontal braces/arrows), Conv_brackets / Conv_brack_sm (large brackets)', 'Conv_script, Conv_fraktur, Conv_doubleStruck (alphabet variants)', 'Conv_roundBrackets1854…3454 (parenthesis sizes), moe-arabic (Arabic letters)'];

// ---------- 6 interfaces ----------
h += `<div class="sec">` + H2('6', 'External interface requirements', 's6') + `
<h3>6.1 User interface — geometry and design tokens</h3>
<p>The values below were measured on the reference (device scale 1, widget at 725 × 415 px) with coordinates relative to the widget’s top-left corner. They are normative for pixel parity (UI-001…UI-012, NFR-012). The complete token list is Appendix H.</p>
<table><tr><th>Element</th><th>x, y, w, h (px)</th><th>Style</th></tr>
${[['Editor root', sp.editor], ['Toolbar block', sp.toolbar], ['Tab strip (header)', sp.header], ['Selected tab', sp.tabSelected], ['Non-selected tab (example #2)', sp.tab2], ['Contextual tab (not selected)', sp.contextTab], ['Help link', sp.link], ['Toolbar panel', sp.panel], ['Formula display', sp.formula], ['First toolbar button', sp.firstButton]].map(([n, o]) => `<tr><td>${n}</td><td>${o.rect ? o.rect.join(', ') : ''}</td><td class="mono">bg ${esc(o.css.backgroundColor)} · border-top ${esc(o.css.borderTop)} · radius ${esc(o.css.borderRadius)} · font ${esc(o.css.fontSize)}/${esc(o.css.fontWeight)}</td></tr>`).join('')}
</table>
<h3>6.2 Software interfaces</h3><p>Host API: chapter 9. Service API: section 5.1. Browser APIs used: DOM, Pointer Events, Clipboard API (async + legacy <code>execCommand</code> fallback), Canvas 2D (handwriting), <code>beforeinput</code>/composition events, <code>matchMedia</code>, <code>ResizeObserver</code>, FontFace API.</p>
<h3>6.3 Communications interfaces</h3><p>HTTPS, JSON and form-encoded bodies, CORS enabled for configured origins, <code>Content-Type: text/plain; charset=UTF-8</code> for text results and <code>image/svg+xml</code>, <code>image/png</code> for rendering.</p>
<h3>6.4 Fonts and assets</h3><ul>${fontlist.map(f => `<li>${esc(f)}</li>`).join('')}</ul><p class="small">Math glyphs: STIX Two Math / STIX fonts (SIL Open Font License). UI icons: to be drawn by the implementer following Appendix C icon sheet (each icon is a 22–33 px raster/vector glyph; “icons.png” of the reference is a proprietary sprite).</p></div>`;

// ---------- 7 data ----------
h += `<div class="sec">` + H2('7', 'Data requirements', 's7') + `
<h3>7.1 Document format</h3><p>The document is a single Presentation MathML <code>&lt;math&gt;</code> tree. The reference editor emitted ${prof.documents} different documents during testing; the element and attribute inventory of Appendix D is the closed set that the component SHALL produce and accept (other markup is preserved on a best-effort basis when pasted).</p>
<h3>7.2 Serialisation rules (normative)</h3><ol>
<li>Root: <code>&lt;math xmlns="http://www.w3.org/1998/Math/MathML"&gt;</code>; the empty document is <code>&lt;math xmlns="…"/&gt;</code> (self-closing). Editor extension namespace <code>xmlns:wrs="http://www.wiris.com/xml/mathml-extension"</code> is declared on the root only when a <code>wrs:</code> attribute is present.</li>
<li>No whitespace between elements; empty elements are self-closed (<code>&lt;mrow/&gt;</code>, <code>&lt;mtd/&gt;</code>, <code>&lt;msqrt/&gt;</code>).</li>
<li>Non-ASCII characters are written as numeric character references with upper-case hexadecimal (<code>&amp;#xD7;</code>, <code>&amp;#x3C0;</code>); the five XML special characters as <code>&amp;lt; &amp;gt; &amp;amp; &amp;quot;</code> (apostrophe is literal).</li>
<li>Letters: <code>&lt;mi&gt;</code> one per letter (merged only for recognised function names, Automatic-italic-off runs, Arabic ligature runs and inserted CJK/Hebrew strings); digit runs: one <code>&lt;mn&gt;</code>; everything else <code>&lt;mo&gt;</code>; text mode: <code>&lt;mtext&gt;</code>.</li>
<li>Empty slots serialise as <code>&lt;mrow/&gt;</code>; the base slot of a script created on an empty document is <code>&lt;maction actiontype="argument"&gt;&lt;mrow/&gt;&lt;/maction&gt;</code>.</li>
<li>Whole-equation style is stored on the root (<code>style="font-family:…"</code>, <code>dir="rtl"</code>) or as a single wrapping <code>&lt;mstyle mathsize="…"&gt;</code>.</li></ol>
<h3>7.3 Canonical outputs (selection)</h3><table class="cat"><tr><th>Action</th><th>MathML</th></tr>
${[['Fraction on empty editor', '<math><mfrac><mrow/><mrow/></mfrac></math>'], ['Square root with x selected', '<math><msqrt><mi>x</mi></msqrt></math>'], ['Superscript after x', '<math><msup><mi>x</mi><mrow/></msup></math>'], ['Parentheses', '<math><mfenced><mrow/></mfenced></math>'], ['Square brackets', '<math><mfenced open="[" close="]"><mrow/></mfenced></math>'], ['2×2 matrix (parentheses)', '<math><mfenced><mtable><mtr><mtd/><mtd/></mtr><mtr><mtd/><mtd/></mtr></mtable></mfenced></math>'], ['Bold x', '<math><mi mathvariant="bold-italic">x</mi></math>'], ['Red x', '<math><mi mathcolor="#FF0000">x</mi></math>'], ['Regular text', '<math><mtext>hello&#xA0;world</mtext></math>'], ['Line break', '<math><mi>a</mi><mspace linebreak="newline"/><mi>b</mi></math>'], ['RTL', '<math dir="rtl"><mi>a</mi></math>'], ['Font size 24px', '<math><mstyle mathsize="24px"><mi>x</mi></mstyle></math>']].map(([a, b]) => `<tr><td>${esc(a)}</td><td class="mm">${esc(b)}</td></tr>`).join('')}</table>
<p>Full per-control expectations: Appendix C.</p></div>`;

// ---------- 8 architecture & technology ----------
h += `<div class="sec">` + H2('8', 'Architecture and technology (design constraints)', 's8') + `
<h3>8.1 Architectural principles</h3><ol>
<li><b>Model–command–view:</b> an immutable document tree (MathML-shaped) is changed only through commands (insert template, insert symbol, delete, format …); a command stack provides undo/redo; every command returns a new tree and the new caret/selection.</li>
<li><b>Layout independent of rendering:</b> a layout engine computes boxes (width, height, baseline) from OpenType MATH constants of STIX Two Math; the renderer positions DOM nodes (or SVG) from those boxes and paints caret, selection, highlights and empty-slot boxes as overlays.</li>
<li><b>Input isolation:</b> one hidden input element receives keyboard, IME and clipboard events; pointer events are handled on the display; handwriting uses its own canvas module.</li>
<li><b>Declarative toolbar:</b> tabs, groups, controls, pop-ups and contextual controls are data (JSON) generated from Appendix C/G; the same data drives rendering, keyboard navigation, tooltips and tests.</li>
<li><b>Services behind adapters:</b> all network access is through a typed <code>Services</code> interface with default HTTP implementation, so vendors or self-hosted engines can be swapped (SVC-009).</li>
<li><b>Parity switch:</b> quirks of Appendix A are isolated behind <code>parity</code>.</li></ol>
<h3>8.2 Recommended technology stack</h3><table><tr><th>Concern</th><th>Choice</th><th>Rationale</th></tr>
<tr><td>Language / build</td><td>TypeScript 5 (strict), Vite 6 + Rollup library mode, ESM + UMD bundle, no runtime framework dependency</td><td>Type safety, small bundle, embeddable via script tag or npm.</td></tr>
<tr><td>UI shell</td><td>Custom Elements (<code>&lt;math-editor&gt;</code>) with Shadow DOM or scoped CSS (<code>.wrs_editor</code>); Lit 3 allowed for dialogs</td><td>Host isolation (NFR-004).</td></tr>
<tr><td>Layout / fonts</td><td>OpenType MATH table via <code>opentype.js</code> (or HarfBuzz WASM) with STIX Two Math (OFL), subset per script</td><td>Typographically correct fractions/scripts/radicals; metric parity.</td></tr>
<tr><td>Rendering</td><td>Absolutely positioned DOM spans for glyph runs + SVG for rules/radicals/stretchy delimiters; Canvas 2D for handwriting</td><td>Matches reference DOM model; crisp at all zoom levels.</td></tr>
<tr><td>State / undo</td><td>Immutable tree (structural sharing), command objects, inverse patches</td><td>Cheap history, deterministic tests.</td></tr>
<tr><td>Input</td><td><code>beforeinput</code>, <code>compositionstart/end</code>, hidden <code>&lt;input title="Math input"&gt;</code></td><td>IME and mobile keyboards.</td></tr>
<tr><td>Accessibility</td><td>ARIA APG patterns (tablist, toolbar with roving tabindex), <code>aria-live="polite"</code> region</td><td>ACC-001…005.</td></tr>
<tr><td>Services runtime</td><td>Node.js 22 LTS, Fastify 5, zod validation, pino logging, Docker, stateless horizontal scaling</td><td>Small, fast, easily self-hosted.</td></tr>
<tr><td>LaTeX ↔ MathML</td><td>MathJax 3 TeX input → MathML (<code>mathjax-full</code>); <code>mathml-to-latex</code> (or a custom serializer for the editor's closed MathML profile)</td><td>The profile of Appendix D is small, so a deterministic serializer is feasible and testable.</td></tr>
<tr><td>Spoken text</td><td>Speech Rule Engine (SRE 4) with a phrase post-processor matching SVC-002</td><td>Industry standard for MathML speech.</td></tr>
<tr><td>Images</td><td>MathJax SVG output (or own layout engine server-side) → <code>resvg-js</code> for PNG, <code>svg-to-pdfkit</code> for PDF</td><td>One layout truth for SVG/PNG/PDF.</td></tr>
<tr><td>Handwriting recognition</td><td>Adapter interface <code>Recognizer.recognize(strokes): {mathml, score}</code> with a self-hosted model (sequence-to-sequence OCR for online ink) or a commercial recognition API behind the adapter</td><td>Recognition is the only ML component; isolate it.</td></tr>
<tr><td>Quality</td><td>Vitest (unit), Playwright (UI/e2e, screenshot parity), pact-style contract tests for services, axe-core (a11y), Lighthouse CI (perf)</td><td>NFR-009, NFR-012.</td></tr>
<tr><td>CI/CD, ops</td><td>GitHub Actions, semantic-release, container registry, OpenTelemetry traces, structured logs without content</td><td>NFR-006/007/011.</td></tr></table>
<h3>8.3 Security design</h3><ul><li>Treat MathML/LaTeX as untrusted: parse with a strict parser, enforce the closed element/attribute set (Appendix D), cap depth (≤ 64) and node count (≤ 20 000), reject DOCTYPE/entities.</li>
<li>Services: HTTPS only, CORS allow-list, 1 MB body limit, per-IP rate limit, no persistence of payloads, timeouts (3 s conversion, 5 s render, 8 s recognition), SSRF-safe (no remote fetch), dependency scanning.</li>
<li>Output sanitisation before DOM insertion (OUT-006) and CSP-compatible output (no inline scripts, SVG without script/foreignObject).</li></ul></div>`;

// ---------- 9 output extraction ----------
h += `<div class="sec">` + H2('9', 'Output extraction layer (addition to the reference)', 's9') + `
<p>This chapter is the only functional addition to the reference playground. It does <b>not</b> alter the widget (725 × 415 px, behaviour of chapters 4–5). Requirements OUT-001…008 (section 9.5) define it normatively; the rest of the chapter gives the design and the formats researched from the vendor documentation.</p>
<h3>9.1 Output formats</h3><table><tr><th>Format</th><th>How obtained</th><th>Use</th><th>Notes / best practice</th></tr>
<tr><td>Presentation MathML</td><td>Local: <code>getMathML()</code></td><td>Canonical storage, rendering in browsers (MathML Core), exchange</td><td>Store this as the source of truth; always keep the namespace; round-trip safe (OUT-008).</td></tr>
<tr><td>MathML + semantics/annotation</td><td>Local: <code>getMathML({semantics:true})</code></td><td>Carry LaTeX/strokes with the equation</td><td><code>&lt;semantics&gt;&lt;mrow/&gt;&lt;annotation encoding="application/x-tex"&gt;</code>.</td></tr>
<tr><td>LaTeX</td><td>Service <code>mathml2latex</code> (or local serializer)</td><td>Authoring systems, LMS, publishing</td><td>Meaning-preserving; some editor-specific layout (nudges, spacing) is not representable.</td></tr>
<tr><td>Content MathML</td><td>Service <code>mathml2content</code></td><td>Evaluation, CAS</td><td>Only for semantically unambiguous input.</td></tr>
<tr><td>SVG</td><td>Service <code>render.svg</code> / local</td><td>Vector image in HTML/PDF, best quality</td><td><b>Recommended image format</b>; embed fonts or paths; set <code>role="img"</code> and <code>aria-label</code> from the accessible text.</td></tr>
<tr><td>PNG</td><td>Service <code>render.png</code> (dpi, zoom)</td><td>Email, legacy systems</td><td>Use dpi 192+ for retina; keep the baseline offset to align with text.</td></tr>
<tr><td>PDF / EPS</td><td>Service <code>render.pdf</code> / <code>render.eps</code></td><td>Print workflows</td><td>Vector; fonts embedded.</td></tr>
<tr><td>Accessible text</td><td>Service <code>mathml2accessible</code></td><td><code>alt</code>/<code>aria-label</code>, screen-reader fallback</td><td>Pass the user language (<code>lang</code>); regenerate when the formula changes.</td></tr>
<tr><td>Plain text</td><td>Local linearisation</td><td>Search indexing, previews</td><td>Unicode math, e.g. “x+1=2”, “√(x)”, “a/b”.</td></tr>
<tr><td>Clipboard</td><td>Editor Copy / Output panel Copy</td><td>Paste into other editors</td><td>MathML text + HTML + plain (OUT-005).</td></tr></table>
<h3>9.2 JavaScript API (normative signatures)</h3>
<pre class="mono" style="font-size:7.3pt;background:#f3f5f8;padding:2mm;white-space:pre-wrap">interface EditorOptions {
  language?: string;                 // default 'en'
  autoformat?: boolean;              // default false (EDT-005)
  toolbarSize?: 1 | 1.5 | 2;         // default 1 (UI-006)
  detectHand?: boolean;              // default true (HND-*)
  fontStyle?: 'initial'|'normal'|'italic';   // default 'initial'
  reservedWords?: string[];          // default Appendix E
  globalStyles?: boolean;            // default true
  rtlLanguages?: string[]; arabicIndicLanguages?: string[]; easternArabicIndicLanguages?: string[];
  parity?: 'exact'|'improved';       // default 'exact' (Appendix A)
  services?: { baseUrl: string; headers?: Record&lt;string,string&gt;; telemetry?: boolean };
  mml?: string;                      // initial content
}
interface MathEditor {
  insertInto(el: HTMLElement): void;  destroy(): void;
  getMathML(o?: { semantics?: boolean; annotations?: boolean }): string;
  setMathML(mml: string, o?: { focus?: boolean }): Promise&lt;void&gt;;   // clears history
  isEmpty(): boolean;  isReady(): boolean;  focus(): void;  blur(): void;
  undo(): void;  redo(): void;  reset(): void;
  getLaTeX(): Promise&lt;string&gt;;  getAccessibleText(lang?: string): Promise&lt;string&gt;;
  getSVG(o?: RenderOptions): Promise&lt;string&gt;;  getPNG(o?: RenderOptions): Promise&lt;Blob&gt;;
  getPlainText(): string;  getImageDataURL(format: 'svg'|'png', o?: RenderOptions): Promise&lt;string&gt;;
  setParams(p: Partial&lt;EditorOptions&gt;): void;  getVersion(): string;
  on(ev: 'ready'|'change'|'focus'|'blur'|'tabchange'|'handstart'|'handend', cb: (e: any) => void): () =&gt; void;
}
interface RenderOptions { zoom?: number; dpi?: number; background?: string; color?: string; fontSize?: string }</pre>
<p>Compatibility: <code>getMathML</code>, <code>setMathML</code>, <code>isFormulaEmpty</code> (alias of <code>isEmpty</code>), <code>focus</code>, <code>blur</code>, <code>getVersion</code>, <code>setParams</code>, <code>insertInto</code> keep the vendor names (see vendor JsEditor/EditorInterface reference) so existing integrations work.</p>
<h3>9.3 Output panel (optional UI, outside the widget)</h3><p>A strip of 725 px width and 180 px height directly below the widget: a segmented control (MathML · LaTeX · SVG · PNG · Accessible text · Plain text), a read-only content area (monospace for code, image preview for SVG/PNG), a <b>Copy</b> button, a <b>Download</b> button for images, a status line (“Updated 12:01:03 · 1.2 KB”) and an inline error with <b>Retry</b>. It updates on <code>change</code> (debounce 150 ms), shows a skeleton while a service request is in flight and never blocks the editor. Keyboard: tabs by arrow keys, Copy by Enter.</p>
<h3>9.4 Integration sequence</h3><ol><li>Host loads the bundle and calls <code>MathEditor.create(options)</code>, <code>insertInto(container)</code>.</li><li>Editor emits <code>ready</code>; host optionally calls <code>setMathML(stored)</code>.</li><li>User edits → <code>change</code> events (debounced).</li><li>On save: <code>getMathML()</code> (sync) and, in parallel, <code>getAccessibleText(lang)</code> + <code>getSVG()</code> for display fallbacks.</li><li>Host stores MathML (source of truth) and derived artefacts; renders with MathML + SVG fallback.</li></ol>
` + S.reqTable('OUT', ['9.5 ' + S.ALL.OUT[0], S.ALL.OUT[1]]) + '</div>';
module.exports = { h };
