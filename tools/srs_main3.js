const fs = require('fs');
const L = require('./build_lib');
const { esc, loadJson, exists, M } = L;
const S = require('./srs_build');
const base = require('./srs_main');
const { st, prof, sp, H2 } = base;
let h = '';
// ---------- 10 verification ----------
const suites = [
 ['TS-01', 'Toolbar control crawl (4 states × 687 controls + 13 special)', 'behav.js → out/tab0…8.json', 'TB-*, PUP-004', 'For every control: MathML in states A (empty), A2 (typed 7), B (after x), C (x selected) equals the golden value.'],
 ['TS-02', 'Chrome, states, tab navigation', 's01_layout, s02_tabs_kbd', 'CHR-*, TAB-*', 'Hover/pressed/disabled/focus; Alt+digit, Alt+arrows, grid keys.'],
 ['TS-03', 'Matrix picker', 's09_matrix_picker, s20_matrix_nav', 'MPK-*', 'Hover preview, sizes 1…100, normalisation, close behaviour, focus quirk, keyboard navigation inside matrix.'],
 ['TS-04', 'Clipboard and history', 's07_clipboard_undo', 'CLP-*', 'Button states, clipboard payloads, paste of MathML/LaTeX/text, undo/redo.'],
 ['TS-05', 'Formatting and colour', 's05_format, s22_swatches, s12_modes', 'FMT-*', 'Bold/italic/auto-italic/text/colour (25 swatches, hex), fonts, sizes, mode interplay.'],
 ['TS-06', 'Special characters', 's06_unicode', 'UNI-*', 'Categories and counts, code search, insertion, closing.'],
 ['TS-07', 'Typing and recognition', 's03_typing, s26_reserved_words, s25_digit_modes', 'EDT-003…007, FMT-009', 'Token creation, function names, autoformat off, Unicode, digit modes.'],
 ['TS-08', 'Keyboard, caret, mouse, scrolling', 's08_keyboard_edit, s21_caret_probe, s13_mouse_scroll', 'EDT-008…023', 'Caret traversal table, selection, smart delete, Enter/Space/Tab/Esc, shortcuts.'],
 ['TS-09', 'Contextual tab', 's10b_ctx_*, s23_length_fields, s16_elementary', 'CTX-*, ELM-*', 'Control sets per context; every control; length values; carries; stacks.'],
 ['TS-10', 'Handwriting', 's11_handwriting, s24_hand_edit', 'HND-*', 'Open/close, strokes, recognition requests, undo/redo/clear, scribble erase, help.'],
 ['TS-11', 'Pop-ups', 's19_more_popup', 'PUP-*', 'Open, keyboard, escape, switch, toggle.'],
 ['TS-12', 'Modes', 'out_rtl/*, out_noitalic/*', 'MOD-*', 'Whole-toolbar re-crawl in RTL and automatic-italic-off.'],
 ['TS-13', 'Accessibility', 's14_a11y_net', 'ACC-*', 'ARIA tree, live region texts, tab order, spoken text.'],
 ['TS-14', 'Services and network', 's17_network_ui_only', 'SVC-*', 'Which user action triggers which request, payloads, responses.'],
 ['TS-15', 'Touch and responsive', 's18_touch, s15_responsive', 'TCH-*, UI-012', 'Selection handles, hidden below 1275 px host width.'],
];
h += `<div class="sec">` + H2('10', 'Verification and validation', 's10') + `
<h3>10.1 Strategy</h3><ul><li><b>Golden-master testing:</b> the evidence files of FR-DOC (MathML per control and state, scenario steps with screenshots, network traces) are the oracle; the implementation SHALL reproduce them byte-for-byte for MathML and within NFR-012 for pixels.</li>
<li><b>Layers:</b> unit tests (model, commands, serialiser, layout metrics), component tests (toolbar data, dialogs), end-to-end tests (Playwright, the same scripts used for the reference), service contract tests, accessibility (axe, keyboard-only script) and performance (NFR-001/002).</li>
<li><b>Differential run:</b> the same Playwright scripts SHALL be run against the reference URL and the implementation; the report lists any MathML/screenshot difference. Zero differences in “exact” parity mode is the exit criterion.</li></ul>
<h3>10.2 Acceptance test suites</h3><table><tr><th>Suite</th><th>Content</th><th>Evidence / script</th><th>Requirements</th><th>Pass criterion</th></tr>${suites.map(s => `<tr><td>${s[0]}</td><td>${esc(s[1])}</td><td class="mono">${esc(s[2])}</td><td>${esc(s[3])}</td><td>${esc(s[4])}</td></tr>`).join('')}</table>
<h3>10.3 Exit criteria</h3><ol><li>All suites pass in Chrome, Firefox, Safari and Edge (latest) at device scale 1 and 2.</li><li>Differential run: 0 MathML differences over the ${st.cases} control cases and ${st.scenarioSteps} scenario steps; ≤ 1 % pixel difference on toolbar/pop-up/dialog screenshots.</li><li>Accessibility: 0 critical axe violations; full keyboard script passes.</li><li>Security: dependency audit clean, OWASP ASVS L2 checklist for services.</li></ol>
<h3>10.4 Traceability matrix</h3><table><tr><th>Requirement area</th><th>FR-DOC sections</th><th>Evidence datasets</th><th>Test suite</th></tr>
${[['UI, CHR', '§2, §4, §25', 's01_layout, s15_responsive, style probe', 'TS-02, TS-15'], ['TAB', '§5', 's02_tabs_kbd', 'TS-02'], ['PUP', '§6, §11', 'out/*_popup, s19_more_popup', 'TS-01, TS-11'], ['MPK', '§7, §16', 's09_matrix_picker, s20_matrix_nav', 'TS-03'], ['EDT, INS', '§6, §13–§17', 's03_typing, s08, s13, s21, s26', 'TS-01, TS-07, TS-08'], ['FMT, UNI', '§9, §10, §12b', 's05, s06, s12, s22, s25', 'TS-05, TS-06, TS-07'], ['CLP', '§8', 's07_clipboard_undo', 'TS-04'], ['CTX, ELM', '§19–§21', 's10b_ctx_*, s16, s23', 'TS-09'], ['HND', '§22', 's11, s24', 'TS-10'], ['MOD', '§12, §26', 's12, out_rtl, out_noitalic', 'TS-12'], ['ACC, TCH', '§18, §24', 's14, s18', 'TS-13, TS-15'], ['SVC, OUT', '§3, §23', 's17_network_ui_only', 'TS-14'], ['TB-*', '§6', 'out/tab*.json', 'TS-01']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="mono">${esc(r[2])}</td><td>${r[3]}</td></tr>`).join('')}</table></div>`;

// ---------- Appendices ----------
h += `<div class="sec">` + H2('A', 'Appendix A — Parity decisions (reference quirks)', 'appA') + `<p>Parity mode <code>exact</code> (default) reproduces the reference; <code>improved</code> applies the listed fix. Both modes SHALL be covered by tests (suite TS-xx with <code>parity</code> parameter).</p><table><tr><th>ID</th><th>Observed in the reference</th><th>exact</th><th>improved</th><th>Evidence</th></tr>${S.QUIRKS.map(q => `<tr><td>${q[0]}</td><td>${q[1]}</td><td>${esc(q[2])}</td><td>${esc(q[3])}</td><td>${esc(q[4])}</td></tr>`).join('')}</table></div>`;

h += `<div class="sec">` + H2('B', 'Appendix B — Evidence datasets and reproduction', 'appB') + `<p>All behaviour statements are backed by machine-readable evidence produced by the harness (Node.js + Playwright, Chrome). To reproduce or to run the differential comparison, execute the scripts below against any URL that hosts the editor.</p><table><tr><th>Dataset / script</th><th>Content</th></tr>
${[['out/tab0…8.json (behav.js)', 'Every toolbar control and pop-up item: states A, A2, B, C (MathML + screenshots + icon crop + coordinates)'], ['out_rtl/*, out_noitalic/* (behav_mode.js)', 'Same crawl with RTL / automatic italic off'], ['sc/s01…s26 (*.js)', 'Scenarios: chrome, tabs, typing, formatting, clipboard, special characters, matrix picker and navigation, keyboard, caret probes, mouse, touch, contextual controls, length fields, elementary math, handwriting, network, accessibility, responsive, digit modes, reserved words'], ['sc/s17_calls.json', 'UI-only network trace with payloads and responses'], ['mathml_profile.json', 'Element/attribute inventory of all produced MathML'], ['style_probe.json, template.css', 'Computed geometry and style of the reference'], ['docs/*, docs2/*', 'Vendor documentation excerpts used for terminology']].map(r => `<tr><td class="mono">${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table></div>`;
const c = S.catalogue();
h += `<div class="sec wide">` + H2('C', 'Appendix C — Control catalogue (' + c.total + ' control requirements)', 'appC') + `<p>Each row is a requirement: <b>“Activating the control with the tooltip … SHALL yield the MathML shown for states A, B and C and place the caret as stated.”</b> Coordinates are relative to the widget top-left (x, y of the control box and its size); for pop-up items the position inside the pop-up follows the order of the table (single column for the Symbols/Arrows/Matrices/Big-operator/Calculus pop-ups; multi-row blocks for the Greek tab). State A = empty editor; B = after typing “x”, caret at end; C = “x” typed and selected.</p>` + c.html + '</div>';

// D MathML profile
h += `<div class="sec">` + H2('D', 'Appendix D — MathML profile produced by the editor', 'appD') + `<p>Derived from ${prof.documents} documents produced by the reference.</p><table><tr><th>Element</th><th>Occurrences</th><th>Attributes seen</th></tr>${Object.entries(prof.elements).sort((a, b) => b[1].count - a[1].count).map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td>${v.count}</td><td class="mono">${esc(v.attrs.join(', '))}</td></tr>`).join('')}</table>
<table><tr><th>Attribute</th><th>On elements</th><th>Values observed</th></tr>${Object.entries(prof.attributes).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td class="mono">${esc(v.on.join(', '))}</td><td class="mono">${esc(v.values.join(' · '))}</td></tr>`).join('')}</table></div>`;

// E reserved words / digits
h += `<div class="sec">` + H2('E', 'Appendix E — Recognised words, digit sets and number handling', 'appE') + `
<table><tr><th>Item</th><th>Specification</th></tr>
<tr><td>Reserved (function) words, Automatic italic on</td><td><b>sin, cos, tan, log, ln</b> — exact lower-case run inside a longer typed run is also recognised (“arcsin” → a r c <i>sin</i>, “sinh” → <i>sin</i> h, “asin” → a <i>sin</i>, “cosec” → <i>cos</i> e c). <b>Not</b> recognised (typed as single italic letters): cot, sec, csc, cosec (as a word), lg, exp, lim, liminf, limsup, max, min, sup, inf, det, dim, ker, gcd, lcm, mod, deg, arg, Re, Im, sgn, Pr, hom, tr, rank, sen, tg, ctg, upper-case variants (Sin, SIN).</td></tr>
<tr><td>Number tokens</td><td>A run of ASCII digits is one <code>mn</code>; “.” and “,” are separate <code>mo</code> tokens (3.14 → 3 . 14; 1,000 → 1 , 000).</td></tr>
<tr><td>Digit sets</td><td>Western 0–9 (default); “Arabic-Indic numerals” button → U+0660…U+0669; “Eastern Arabic-Indic numerals” → U+06F0…U+06F9; the selection persists for later typing (Q-08). Locale parameters: <code>arabicIndicLanguages</code> (ar_eg, ar_sd, ar_sa), <code>easternArabicIndicLanguages</code> (fa, ps, ur), <code>europeanLanguages</code>.</td></tr>
<tr><td>Space</td><td>U+00A0 as <code>mo</code>.</td></tr>
<tr><td>Unicode input</td><td>Any BMP/astral character is accepted; classification: letters → <code>mi</code>, symbols/punctuation → <code>mo</code>.</td></tr></table></div>`;

// F swatches
let sw = ['#FF0000', '#FF00FF', '#0000FF', '#00FFFF', '#00FF00', '#FFFF00', '#7F0000', '#E5C304', '#AE761E', '#7F007F', '#00007F', '#007F7F', '#007F00', '#827F00', '#000000', '#191919', '#333333', '#4C4C4C', '#666666', '#7F7F7F', '#999999', '#B2B2B2', '#CCCCCC', '#E5E5E5', '#FFFFFF'];
if (exists('sc/s22_swatches.json')) { const j = loadJson('sc/s22_swatches.json'); const got = j.steps.map(s => (s.mathml.match(/mathcolor="([^"]+)"/) || [0, '#000000'])[1]); if (got.length === 25) sw = got; }
h += `<div class="sec">` + H2('F', 'Appendix F — Colour palette (25 swatches, row-major)', 'appF') + `<table><tr>${[0, 1, 2, 3, 4].map(c => `<th>col ${c + 1}</th>`).join('')}</tr>${[0, 1, 2, 3, 4].map(r => `<tr>${[0, 1, 2, 3, 4].map(c => { const v = sw[r * 5 + c]; return `<td><span style="display:inline-block;width:14px;height:14px;background:${v};border:1px solid #666;vertical-align:middle"></span> ${v}${v === '#000000' ? ' (no attribute)' : ''}</td>`; }).join('')}</tr>`).join('')}</table><p>Palette panel: 102 × 118 px at the button’s lower-left; swatches 13 × 13 px, pitch 18 px (columns) and 18 px (rows), first swatch at (6, 6) inside the panel; a “Color:” label and a hex input below the swatches.</p></div>`;

// G contextual
h += `<div class="sec wide">` + S.contextualCatalogue() + '</div>';

// H tokens
h += `<div class="sec">` + H2('H', 'Appendix H — Design tokens', 'appH') + `<table><tr><th>Token</th><th>Value</th><th>Used for</th></tr>
${[['frame', '#778e9a', 'toolbar frame, tab top border, button hover/focus border (2 px, radius 3 px), handwriting strip'],
['formula border', '#969696 (1 px)', 'formula display'], ['separator', '#bbbdbe (1 px)', 'group separators'], ['select border/text', '#b1b3b4', 'font/size boxes'],
['selected tab bg', '#f2f3f5', 'selected tab (+ selected_tab_background image)'], ['tab bg', '#556e7b', 'non-selected tabs (+ tab_background image)'], ['contextual tab bg', '#dc9e9e', 'Contextual tab (+ context_tab_background image)'],
['selection', '#c3c3c3 / #3c3c3c', 'selection highlight light / dark'], ['edit-context highlight', '#cddce3', 'current row underline band'], ['error', '#ffaaaa', 'invalid region'],
['caret', '#000 1 px × 20 px (white on dark; #888 inverse caret; underline caret black 50 %)', 'caret'], ['empty slot', '#006400', 'empty box outline'],
['touch handles', '#00aaff', 'selection / caret precision handles (24 px square + 12 px arrow)'],
['toolbar font', '11 px bold sans-serif', 'panel text, pop-up titles'], ['formula font size', '16 px (default)', 'math'],
['hand stroke', '#284078', 'handwriting ink'], ['hand grid', '#d4d4d4, 20 px pitch', 'handwriting paper'], ['hand toolbar', '#e5edf0 / keyboard button #4e5861', 'handwriting UI'],
['combo hover', '#a4cae7', 'pop-up item hover'], ['pop-up panel', '#fff, 1 px solid #000', 'drop-down panels'], ['help link', 'rgb(24,33,47)', '? icon']].map(r => `<tr><td>${r[0]}</td><td class="mono">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</table>
<p>Sizes: large button 33 × 33 px (2-row layout), small button 22 × 22 px (3-row layout), expand arrow 7 × 60 px, tab 44 × 22/25 px, separator height 60 px, multi-row panel height 66 px. Scales: toolbarSize 1 / 1.5 / 2 (font 11 / 17 / 22 px).</p></div>`;

// I mode deviations
function modeDiff(dir, label) {
  if (!exists(dir)) return `<p>${label}: no data.</p>`;
  let tot = 0, same = 0, rows = [];
  fs.readdirSync(dir).filter(f => /^tab\d+\.json$/.test(f)).forEach(f => {
    const t = f.match(/\d+/)[0]; const b = exists(`out/tab${t}.json`) ? loadJson(`out/tab${t}.json`) : null; if (!b) return;
    const bm = Object.fromEntries(b.results.filter(r => r.cases).map(r => [r.id, r]));
    loadJson(`${dir}/${f}`).results.filter(r => r.cases && r.cases.A).forEach(r => { const x = bm[r.id]; if (!x || !x.cases) return; tot++; const norm = s => (s || '').replace(/ dir="rtl"/g, ''); const d = ['A', 'A2', 'B', 'C'].filter(k => norm(r.cases[k].mathml) !== norm(x.cases[k].mathml)); if (!d.length) same++; else rows.push([r.id, r.title, d.join(',')]); });
  });
  return `<p><b>${label}:</b> ${tot} controls re-tested, ${same} identical, ${rows.length} differ.</p>${rows.length ? `<table class="cat"><tr><th>Control</th><th>Tooltip</th><th>States that differ</th></tr>${rows.slice(0, 150).map(r => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td><td>${r[2]}</td></tr>`).join('')}</table>${rows.length > 150 ? `<p class="small">… ${rows.length - 150} more (see FR-DOC §26).</p>` : ''}` : ''}`;
}
h += `<div class="sec">` + H2('I', 'Appendix I — Behaviour differences caused by global modes', 'appI') + `<p>Details with MathML are in FR-DOC §26. Selection in RTL mode uses Shift+ArrowRight.</p>` + modeDiff('out_rtl', 'Right to left editing ON (tabs 1–9)') + modeDiff('out_noitalic', 'Automatic italic OFF (tabs 1 and 4)') + '</div>';
// J layout samples
{ const lp = exists('layout_probe.json') ? loadJson('layout_probe.json') : {};
  const names = { 'x': 'x', 'x^2': 'x²', 'x^2^3': 'x^(2^3)', 'x_1': 'x₁', 'frac': 'a/b', 'frac_nested': '(a/b)/c', 'sqrt': '√x', 'sum': '∑ with limits', 'paren': '(x)' };
  h += `<div class="sec">` + H2('J', 'Appendix J — Layout measurements of the reference', 'appJ') + `<p>Measured in the formula display at device scale 1 (coordinates in page px; only differences matter). Visible glyph boxes: text, font size, width × height, top-left.</p><table class="cat"><tr><th>Formula</th><th>Glyph boxes (text · font-size · w×h · x,y)</th><th>Rules (w×h)</th></tr>${Object.keys(lp).filter(k => !/_rules/.test(k)).map(k => `<tr><td>${esc(names[k] || k)}</td><td class="mm">${lp[k].map(e => `${esc(e.t)} · ${e.fs} · ${e.w}×${e.h} · ${e.x},${e.y}`).join('<br>')}</td><td class="mm">${(lp[k + '_rules'] || []).map(r => `${r.w}×${r.h}`).join(', ')}</td></tr>`).join('')}</table></div>`; }

module.exports = { h, suites };
