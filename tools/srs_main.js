const fs = require('fs');
const L = require('./build_lib');
const { esc, loadJson, exists, M } = L;
const S = require('./srs_build');
const prof = loadJson('mathml_profile.json');
const sp = loadJson('style_probe.json');
const st = require('./build_cov').stats();
const today = '2026-10-12';
let h = '';
const toc = [];
const H2 = (num, title, id) => { const n = /^Appendix/.test(title) ? '' : num; toc.push([n, title, id, 2]); return `<h2 id="${id}" class="sec1">${n} ${esc(title)}</h2>`; };

// ---------- cover + control ----------
h += `<div class="cover"><div class="small">Software Requirements Specification (IEEE 29148 structure)</div>
<h1>MathType-style Equation Editor — Web Playground</h1>
<p style="font-size:12pt">Complete, testable specification of the embedded editor of https://www.wiris.com/en/mathtype/ and of its output-extraction layer.</p>
<table class="dc" style="width:160mm">
<tr><th style="width:45mm">Document</th><td>SRS-MTE-001</td></tr>
<tr><th>Version / status</th><td>1.0 — release candidate for implementation</td></tr>
<tr><th>Date</th><td>${today}</td></tr>
<tr><th>Companion document</th><td><b>FR-DOC</b>: “MathType Web — Landing-page Playground: functional requirements &amp; UI behaviour reference” (evidence, ${st.screens} screenshots, ${st.scenarioSteps} scenario steps, ${st.cases} control cases)</td></tr>
<tr><th>Reference system</th><td>Wiris MathType Web editor build 7.25.6.804ace, handwriting component 7.11.4.71fa31 (public playground)</td></tr>
<tr><th>Requirement count</th><td>${Object.values(S.ALL).reduce((a, [t, x]) => a + x.length, 0)} specified requirements + ${S.catalogue().total} control requirements (Appendix C) + ${S.QUIRKS.length} parity decisions</td></tr>
</table>
<p class="small" style="margin-top:6mm">“SHALL” = mandatory; “SHOULD” = recommended; “MAY” = optional. Verification: T = automated test, I = inspection, D = demonstration. Every behaviour statement was observed and measured on the reference; where the reference shows a defect the decision is recorded in Appendix A (parity mode <code>exact</code> by default).</p></div>`;

h += `<div class="sec"><h2>Document control</h2>
<table class="dc"><tr><th>Version</th><th>Date</th><th>Author</th><th>Change</th></tr>
<tr><td>0.9</td><td>2026-10-11</td><td>Analysis team</td><td>Reference behaviour captured (FR-DOC)</td></tr>
<tr><td>1.0</td><td>${today}</td><td>Analysis team</td><td>Specification completed: requirements, catalogue, data model, services, output extraction, verification</td></tr></table>
<h3>How to use this document</h3>
<ul><li>Chapters 4–7 define <b>what</b> the system does, which interfaces it has and which data it produces (each requirement has a unique ID, a reference into FR-DOC and a verification method).</li>
<li>Appendix C lists <b>every control</b> of the reference toolbar (700) with geometry, icon and exact expected MathML for three test states; implementing it exactly gives the reference behaviour.</li>
<li>Chapter 8 gives the <b>architecture and technology</b> choices; chapter 9 the <b>output extraction</b> layer (the only functionality added to the reference playground); chapter 10 <b>verification</b> and traceability.</li></ul>
<h3>Contents</h3><div class="toc" id="TOC_PLACEHOLDER"></div></div>`;

// ---------- 1 introduction ----------
h += `<div class="sec">` + H2('1', 'Introduction', 's1') + `
<h3>1.1 Purpose</h3><p>This SRS specifies, completely and verifiably, a web-based visual mathematical-equation editor that is functionally and visually equivalent to the editor embedded in the “See MathType in action!” section of the Wiris MathType landing page (“the reference playground”), plus an output-extraction layer that makes the edited equation usable by host applications (MathML, LaTeX, SVG/PNG images, accessible text, clipboard). A team that implements the requirements, the control catalogue and the data model of this document SHALL obtain a component whose behaviour can be proven equal to the reference by the acceptance tests of chapter 10.</p>
<h3>1.2 Scope</h3><p><b>In scope:</b> the complete editor widget (725 × 415 px): tab strip, ten toolbar tabs with ${st.btn + 13 + st.pop} controls, pop-up groups, matrix/table picker, colour palette, special-characters chooser, font and size selectors, clipboard and history controls, formatting toggles, right-to-left and Arabic modes, the editing area with caret/selection/keyboard/mouse/touch behaviour, the Contextual tab (${st.ctxControls} distinct controls over 12 structure contexts), elementary mathematics, handwriting mode, accessibility, and the backend services the widget needs. <b>Additional (the only addition):</b> the output-extraction API, events and optional output panel (chapter 9).</p>
<p><b>Out of scope:</b> the marketing page around the widget, cookie banner, third-party scripts; products/tabs that are not part of the reference toolbar configuration (Publishers tab, ChemType, LaTeX/MathML input windows of the Microsoft 365 integration, image-recognition drop zone).</p>
<h3>1.3 Definitions</h3><table><tr><th>Term</th><th>Meaning</th></tr>
<tr><td>Reference playground</td><td>The widget at https://www.wiris.com/en/mathtype/, built by <code>com.wiris.jsEditor.JsEditor.newInstance({language:'en'}).insertInto(#editorContainer)</code>.</td></tr>
<tr><td>Presentation MathML</td><td>W3C MathML presentation markup, the canonical document format of the editor.</td></tr>
<tr><td>Slot</td><td>An editable position inside a structure (numerator, radicand, cell …); an empty slot is drawn as a small green box.</td></tr>
<tr><td>Template / symbol</td><td>Toolbar controls that insert a structure with slots / a single character.</td></tr>
<tr><td>Contextual control</td><td>Control shown in the Contextual tab for the structure at the caret.</td></tr>
<tr><td>Parity mode</td><td>Configuration <code>parity: "exact" | "improved"</code>; “exact” reproduces the reference including its quirks (Appendix A).</td></tr>
<tr><td>FR-DOC</td><td>The companion functional reference containing the evidence.</td></tr></table>
<h3>1.4 References</h3><ul>
<li>FR-DOC (companion document, evidence base for every requirement).</li>
<li>W3C MathML 3.0 / MathML Core; WAI-ARIA 1.2 and ARIA Authoring Practices; WCAG 2.2.</li>
<li>Vendor documentation (terminology and parameter names): docs.wiris.com — MathType Web interface, Toolbar and icons, Contextual tab, Keyboard shortcuts, Autoformat, Formatting, Insert special characters, Handwritten input, Editor parameters, JavaScript GUI API reference, Conversion / Rendering / Accessibility services references.</li>
<li>IEEE/ISO/IEC 29148:2018 (requirements engineering); OWASP ASVS 4 (security requirements).</li></ul></div>`;

// ---------- 2 overall description ----------
h += `<div class="sec">` + H2('2', 'Overall description', 's2') + `
<h3>2.1 Product perspective</h3><p>The product is a self-contained JavaScript component (no framework dependency) that is embedded into a host page, plus a small set of HTTP services. The component keeps the whole editing state in the browser; services are only used for LaTeX/MathML conversion, spoken-text generation, image rendering and handwriting recognition (FR-DOC §3, §23).</p>
<svg class="arch" viewBox="0 0 760 260" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="11">
<rect x="10" y="10" width="480" height="240" fill="#eef5fc" stroke="#4f8fcf"/><text x="20" y="28" font-weight="bold">Browser — Editor component (TypeScript)</text>
<rect x="25" y="40" width="130" height="40" fill="#fff" stroke="#667"/><text x="35" y="64">Shell / toolbar / tabs</text>
<rect x="170" y="40" width="130" height="40" fill="#fff" stroke="#667"/><text x="180" y="64">Dialogs &amp; pop-ups</text>
<rect x="315" y="40" width="160" height="40" fill="#fff" stroke="#667"/><text x="325" y="64">Handwriting module</text>
<rect x="25" y="100" width="130" height="40" fill="#fff" stroke="#667"/><text x="35" y="124">Input layer (hidden input)</text>
<rect x="170" y="100" width="130" height="40" fill="#fff" stroke="#667"/><text x="180" y="124">Command / undo engine</text>
<rect x="315" y="100" width="160" height="40" fill="#fff" stroke="#667"/><text x="325" y="124">Document model (MathML tree)</text>
<rect x="25" y="160" width="130" height="40" fill="#fff" stroke="#667"/><text x="35" y="184">Layout engine (OpenType MATH)</text>
<rect x="170" y="160" width="130" height="40" fill="#fff" stroke="#667"/><text x="180" y="184">Renderer + caret/selection</text>
<rect x="315" y="160" width="160" height="40" fill="#fff" stroke="#667"/><text x="325" y="184">Output API &amp; events</text>
<rect x="25" y="212" width="450" height="28" fill="#fff" stroke="#667"/><text x="35" y="230">Optional Output panel (outside the 725×415 widget)</text>
<rect x="540" y="10" width="210" height="240" fill="#fff8ea" stroke="#e8a33a"/><text x="550" y="28" font-weight="bold">HTTP services (Node.js)</text>
<text x="552" y="60">latex2mathml / mathml2latex</text><text x="552" y="85">mathml2content / content2mathml</text><text x="552" y="110">mathml2accessible / accessible2mathml</text><text x="552" y="135">render(.svg/.png/.pdf/.eps)</text><text x="552" y="160">hand/recognize (provider adapter)</text><text x="552" y="185">tick (optional telemetry)</text>
<line x1="490" y1="130" x2="540" y2="130" stroke="#333" stroke-width="2"/></svg>
<h3>2.2 Product functions (summary)</h3><ul>
<li>Visual construction of equations with ${st.btn + 13 + st.pop} toolbar controls in 9 tabs and 24 pop-up groups.</li>
<li>Keyboard-first editing with structure-aware caret movement, selection, smart delete, line breaks and shortcuts.</li>
<li>Formatting: bold, italic, automatic italic, regular text, colour (25 swatches + hex), 6 fonts, 16 sizes, RTL, Arabic ligature, digit styles.</li>
<li>Tables/matrices with size picker and a Contextual tab of ${st.ctxControls} controls; elementary-math stacks and long division.</li>
<li>Handwriting recognition with undo/redo/clear, scribble-erase and in-canvas help.</li>
<li>Accessibility: ARIA roles, live announcements, spoken formula text, complete keyboard operation.</li>
<li><b>Output extraction</b>: MathML, LaTeX, SVG, PNG, PDF/EPS (service), accessible text, plain text, clipboard formats, events.</li></ul>
<h3>2.3 User classes</h3><table><tr><th>Class</th><th>Needs</th></tr><tr><td>Author (student / teacher / editor)</td><td>Build and edit equations quickly by mouse, keyboard, touch or handwriting.</td></tr><tr><td>Integrator (developer)</td><td>Embed the component, configure parameters, read the result in several formats, store and display it safely.</td></tr><tr><td>Assistive-technology user</td><td>Operate everything by keyboard, hear the structure and the formula.</td></tr><tr><td>Operator</td><td>Deploy and monitor the services.</td></tr></table>
<h3>2.4 Operating environment, constraints, assumptions</h3><ul>
<li>Desktop browsers (≥ 1275 px host viewport in the reference page), touch and pen input supported.</li>
<li>Constraint: the widget geometry, colours and behaviours are fixed by this document (pixel parity, NFR-012).</li>
<li>Constraint: Wiris artwork, icon sprites and brand names are proprietary; implementers SHALL draw their own icons following the icon sheet (Appendix C) or obtain a licence. Fonts: STIX Two (SIL OFL) are used for the math glyphs.</li>
<li>Assumption: the host provides HTTPS and a reachable services base URL (or uses the vendor cloud endpoints, SVC-009).</li></ul></div>`;

// ---------- 3 requirement conventions & shell/function reqs ----------
h += `<div class="sec">` + H2('3', 'Requirement conventions', 's3') + `
<p>Requirement IDs have the form <code>AREA-NNN</code>. Control requirements have the form <code>TB-&lt;tab&gt;-[G&lt;group&gt;-]&lt;nnn&gt;</code>. Each row cites the section of FR-DOC that contains the evidence (screenshots, MathML, network trace). “Ver.” gives the verification method. Priority of every requirement is <b>Must</b> unless the text says SHOULD/MAY. Area codes:</p>
<table><tr><th>Code</th><th>Area</th><th>Code</th><th>Area</th><th>Code</th><th>Area</th></tr>
<tr><td>UI</td><td>Shell and layout</td><td>CHR</td><td>Toolbar chrome</td><td>TAB</td><td>Tabs</td></tr>
<tr><td>PUP</td><td>Pop-ups</td><td>MPK</td><td>Matrix picker</td><td>EDT</td><td>Editing area</td></tr>
<tr><td>INS</td><td>Insertion semantics</td><td>FMT</td><td>Formatting</td><td>UNI</td><td>Special characters</td></tr>
<tr><td>CLP</td><td>Clipboard / history</td><td>CTX</td><td>Contextual tab</td><td>ELM</td><td>Elementary math</td></tr>
<tr><td>HND</td><td>Handwriting</td><td>MOD</td><td>Modes</td><td>ACC</td><td>Accessibility</td></tr>
<tr><td>TCH</td><td>Touch</td><td>SVC</td><td>Services</td><td>OUT</td><td>Output extraction</td></tr>
<tr><td>NFR</td><td>Non-functional</td><td>TB</td><td>Control catalogue</td><td>Q</td><td>Parity decisions</td></tr></table></div>`;

h += `<div class="sec">` + H2('4', 'Functional requirements', 's4') + '<p>Sections 4.1–4.18 contain the area requirements; the per-control requirements are in Appendix C (700 rows).</p>' + `<table><tr><th>Area</th><th>Title</th><th>Requirements</th></tr>${Object.entries(S.ALL).map(([k, v]) => `<tr><td>${k}</td><td>${esc(v[0])}</td><td>${v[1].length}</td></tr>`).join('')}<tr><td>TB</td><td>Control catalogue (Appendix C)</td><td>${S.catalogue().total}</td></tr></table>`;
const order = [['UI', '4.1'], ['CHR', '4.2'], ['TAB', '4.3'], ['PUP', '4.4'], ['MPK', '4.5'], ['EDT', '4.6'], ['INS', '4.7'], ['FMT', '4.8'], ['UNI', '4.9'], ['CLP', '4.10'], ['CTX', '4.11'], ['ELM', '4.12'], ['HND', '4.13'], ['MOD', '4.14'], ['ACC', '4.15'], ['TCH', '4.16'], ['LAY', '4.17'], ['TBL', '4.18']];
order.forEach(([k, n]) => { if (S.ALL[k]) h += S.reqTable(k, [n + ' ' + S.ALL[k][0], S.ALL[k][1]]); });
h += '</div>';
h += `<div class="sec">` + H2('5', 'Services and non-functional requirements', 's5') + S.reqTable('SVC', ['5.1 ' + S.ALL.SVC[0], S.ALL.SVC[1]]) + S.reqTable('NFR', ['5.2 ' + S.ALL.NFR[0], S.ALL.NFR[1]]) + '</div>';
module.exports = { h, toc, H2, st, prof, sp };
