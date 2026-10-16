# Technical reference

Everything a developer needs that does not belong on the front page: build and run, deployment, responsive layout, source
layout, the embedding API, the services, how the editor is verified and the known deviations from the reference.
The project overview is in the [main README](../README.md).

A 725 × 415 px equation editor with the full toolbar (700 controls, 10 tabs), the contextual tab, pop-ups,
pickers, handwriting mode and the backend services behind them. It follows the two specification documents in
`docs/` (`SRS.pdf`, `Functional_Reference.pdf`) and was verified against recorded oracle corpora.

```
npm install
npm run build            # → dist/public (editor.js, demo page, fonts) and dist/server.mjs
npm start                # http://localhost:8080  (services under /editor-services/)
npm test                 # unit + golden + oracle suites
```

Documentation: [`docs/`](README.md) – [architecture](ARCHITECTURE.md), [services](SERVICES.md),
[testing](TESTING.md); [changelog](../CHANGELOG.md); [contributing](../CONTRIBUTING.md). Requires Node ≥ 22.

## Deploying

The page is static files plus an optional services server, so there are two ways to host it:

* **With the server** (`npm run build && npm start`, Node ≥ 22): the services of `/editor-services/` are available
  (images through resvg, handwriting, converters). Any Node host works (Render, Railway, Fly.io, a VPS).
* **Static** (`npm run build:static` → `dist/public`): no server. The client first tries the services and, when the host
  answers 403 / 404 / 405 / 501 or is unreachable, falls back — and remembers that for a minute — to its own code:
  SVG, PNG (canvas, fonts embedded in the SVG), PDF / EPS (canvas pixels + the same writers), handwriting recognition
  (the same recogniser in a Web Worker) and the converters. The same build therefore also runs unchanged behind the
  server. `?local=1`-style forcing is available through `services: { local: true }`.
* **GitHub Pages (the project website)**: `npm run build:site` builds the editor (static, minified) and the website around it
  (`tools/build_site.mjs`, content in `site/`) into `dist-site/`: the landing page with the live playground, the full-page
  editor, features, the Arabic math editor page, the guide, FAQ, embedding and about pages, each in English and Arabic
  (`/ar/`), plus `sitemap.xml`, `robots.txt`, structured data and social cards. The workflow `.github/workflows/pages.yml`
  publishes it on every push to `main`. For a custom domain set the repository variables `SITE_URL` (for example
  `https://example.com`) and `CNAME` (`example.com`). `node tools/static_e2e.js` checks the static build in a real browser
  against the server's images. See [SEO.md](SEO.md) for the search-engine setup.

## Responsive layout

* **Wide screens** (container ≥ 725 px and window ≥ 480 px high): the classic 725 × 415 widget, pixel for pixel as before.
* **Narrow or low screens** (phones, portrait tablets, a phone held sideways): the *fluid* layout — the widget fills its
  container (the demo page makes that the whole window), the tab strip and the panel are scrolling strips, controls are
  scaled up on touch devices (≥ 44 px targets; less when the window is low), pop-ups are kept inside the screen, the
  handwriting surface fills the window and follows rotation, inputs are 16 px (no zoom on focus), hover styles do not
  stick on touch.
* The demo page is exactly as high as the window: the editor takes the height the output panel leaves, nothing scrolls
  and the output panel is always visible (`?layout=classic` gives the fixed 725 × 415 widget).
* API: `layout: 'auto' | 'classic' | 'fluid'` option, `editor.setLayout(mode)`, `editor.getLayout()`; a container can also
  say `data-wrs-layout="fluid"`. `node tools/responsive_shots.js` / `tools/responsive_touch.js` check the sizes in a browser.

## Layout

| path | content |
| --- | --- |
| `src/core` | document model (MathML-shaped tree), parser/serialiser, editing engine, keyboard map, contextual-tab model |
| `src/layout` | layout engine (calibrated to the reference metrics), SVG drawing, geometry (hit testing / caret x,y) |
| `src/convert` | MathML → accessible text, MathML → LaTeX, LaTeX → MathML, Presentation ⇄ Content MathML, accessible text → MathML |
| `src/hand` | stroke font, offline handwriting recogniser, stroke simulation |
| `src/ui` | DOM widget: toolbar, formula display, pop-ups, dialogs, handwriting mode, output panel, services client |
| `src/data` | generated data: toolbar catalogue (700 controls), font metrics, symbol names, special-character lists, contextual-tab layouts and icons (`ctx-layout.json`, `ctx-icons.json`) |
| `server` | Node HTTP server (services, PNG/PDF/EPS rendering with resvg, static hosting) |
| `tools` | build script, Playwright harness that replays the reference scenarios against this build, oracle probes |
| `tests` | node:test suites (golden control cases, oracle programs, services, layout, context, hand, …) |

## Embedding

```html
<div id="editorContainer"></div>
<script src="editor.js"></script>
<script>
  const editor = MathTypeX.JsEditor.newInstance({ language: 'en', services: { baseUrl: '/editor-services/' } });
  editor.insertInto(document.getElementById('editorContainer'));
  editor.on('change', (e) => console.log(e.mathml));
</script>
```

API (SRS 9.2): `getMathML({semantics})`, `setMathML`, `isEmpty`/`isFormulaEmpty`, `getLaTeX`, `getAccessibleText`,
`getSVG`, `getPNG`, `getImageDataURL`, `getPlainText`, `undo`, `redo`, `reset`, `focus`, `blur`, `setParams`,
`getVersion`, `destroy`, events `ready change focus blur tabchange handstart handend`.
`MathTypeX.OutputPanel(editor, container)` adds the optional output panel.

## Services (`/editor-services/`)

`mathml2accessible`, `accessible2mathml`, `latex2mathml`, `mathml2latex`, `mathml2content`, `content2mathml`,
`render` / `render.svg` / `render.png` / `render.pdf` / `render.eps` (`mml` or `latex`, `zoom`, `dpi`,
`backgroundColor`, `color`, `fontSize`; `X-Baseline` response header), `hand/recognize`, `tick`.
GET and POST (form, JSON or raw body), errors as `Error: …` with HTTP 200 unless `httpstatus=true`.
Limits: 1 MB body, 120 requests/min/IP, strict MathML parser (no DOCTYPE/entities, depth ≤ 64, ≤ 20 000 nodes).
Environment: `PORT`, `HOST`, `SERVICES_BASE`, `STATIC_DIR`, `CORS_ORIGINS`, `RATE_LIMIT`, `MAX_BODY`, `LOG=off`.

## Verification

* `tests/golden.test.ts` – every toolbar control in four editor states against the recorded reference MathML (2724 cases).
* `tests/noitalic.test.ts` – the same with "Automatic italic" off (1508 cases).
* `tests/oracle.test.ts` – typing / navigation programs against the reference editor (186 + 66 programs; the documented
  deviations are left-script navigation, a few vertical-navigation cases and bold-twice-on-selection).
* `tests/ctxprobe.test.ts`, `tests/context.test.ts` – contextual-tab control sets and apply logic (60/60, 250/250).
* `tests/ctxsets.test.ts`, `tests/ctxeffects.test.ts` – the contextual tab against crawls of the real playground: control set and
  toggles at ~1 100 caret / selection stops, and the MathML of ~500 control clicks (stacks, long division, fences, operators,
  multi-line, Stretchy); recordings in `evidence/ctx_*_ref.json` (tools/ctx_matrix.js).
* `tests/modes.test.ts` – Bold / Italic / Regular text / Automatic-italic-off switched on while any of ~700 toolbar
  controls is used, then "a" typed (≈ 2500 probes of the reference: tools/probe_modes.js, probe_modes_popup.js;
  evidence/modes_regular_auto_ref.json).
* `tests/stacklayout.test.ts` – elementary stacks (rows, lines, carries, `none` cells) and both long-division styles against
  geometry recorded from the reference (tools/probe_stack.js → `evidence/stack_layout_ref.json`, 104/106); caret rectangles and
  the underline mark under the current row were measured with tools/probe_caret.js.
* `tests/stackstrike.test.ts` – "Up diagonal strike" in a stack for the six caret / selection cases recorded with
  tools/probe_strike.js.
* `tests/services.test.ts` also replays `tests/oracle/services_stack.json` (stacks, long division and the formulas the
  reference service refuses: it answers those with "Error converting from MathML to …" text, so do we).
* `tests/fuzz.test.ts` – random sessions (typing, keys, toolbar controls, contextual controls, undo/redo, modes, select all)
  checking after every step that caret, selection, MathML round trip, layout and speech stay consistent
  (`FUZZ_SEED`, `FUZZ_SESSIONS`, `FUZZ_STEPS` select the run; ~640 000 operations were run clean).
* `tests/ctxlayout.test.ts` – the contextual tab (control set, arrangement, toggles) against the recorded reference DOM
  (tools/s30.js → `evidence/ref_ctx_dump.json`; arrangement and icons are generated by `tools/gen/ctx_layout.py`).
* `tests/length.test.ts` – the length fields (column / row / frame spacing, operator spacing, space width / height / depth)
  against the recorded scenario s23.
* `tests/server.test.ts` – HTTP services contract.
* `tests/services.test.ts`, `tests/content.test.ts` – converters against reference service corpora.
* `tools/run_ours.sh sNN …` + `tools/diff_scn.py` – differential replay of the reference scenario scripts (tabs, keyboard,
  clipboard, matrix picker, pop-ups, contextual tab, handwriting, …) against this build.

## Known deviations

* The special-character panel uses the reference character lists; glyph coverage depends on installed fonts.
* Layouts agree with the reference to about a pixel (`tools/shot_formulas.js`, `tools/leafshift.py`, `tests/stacklayout.test.ts`):
  rows, fractions, scripts, matrices, brackets, elementary stacks and long division. Box heights of a few structures (scripts
  over fractions, enclosures, large integrals) differ by 1–3 px from the reference, which only moves the caret / underline
  mark by that much.
* The three vertical-alignment buttons of fences (Baseline / Middle / Middle-baseline) change the layout here; the reference
  editor ignores them (only its exported image differs, for even-row matrices).
* Mouse clicks next to a structure (in the gap between its rows, right of a fraction) use the nearest row; the reference
  uses its own, less regular rule there.
* The reference's conversion services answer a number of formulas with "Error converting …"; the ones seen in the
  recordings are reproduced (`tests/oracle/services_stack.json`), others are converted normally.
* Exports produced in the browser (static build) equal the server's SVG byte for byte and its PNG to anti-aliasing
  differences (browser rasteriser instead of resvg); PDF / EPS wrap a 300 dpi raster in both.
* Formulas are drawn with one bundled font set (STIX Two Math, Liberation Sans, an Arabic face) in the editor, the icons and
  every export, so the canvas and the PNG / SVG / PDF agree; large delimiters are assembled from STIX glyph variants.
* `persist: '<key>'` (editor option; the demo page uses it) keeps formula, tab, typing modes and the output panel's format in
  local storage under `mtx:<key>`; nothing is stored without the option. The formula is user content: clear the key to forget it.
* The Font list's **Arabic fonts** (Noto Naskh Arabic, Noto Sans Arabic, Noto Kufi Arabic, Tajawal) apply to Arabic-script text
  only (letters, digits, punctuation); Latin letters, digits and operators stay in the bundled sans / math faces. The Latin
  entries of the list (Arial, Tahoma, …) are stored in the equation (`style="font-family:…"`) but do not change the drawing.
* The handwriting recogniser is a built-in template matcher with structure parsing (about 98 % of the synthetic corpora in
  `tests/oracle/hand_corpus*_in.json`; real handwriting is less regular). Its answers differ from the reference's cloud
  recogniser in detail; replace `hand/recognize` with a stronger provider if needed – the response contract is unchanged.
* Navigation through structures that contain argument placeholders inside big operators ("Big operator with subscript",
  left scripts) differs by a stop or two from the reference; their contextual controls are the same.
* Disabled toolbar buttons expose `aria-disabled` (SRS ACC-001) which the reference does not.

## Regenerating the README media

The screenshots, the demo video and the position-control clip in `docs/media/` are produced by scripts (start the server first,
`tools/serve.sh start`; needs Playwright with Chrome, Pillow with raqm and ffmpeg):

```
node tools/readme_shots.js                                   # the still screenshots
node tools/readme_demo.js .cache/demo                        # records the demo steps as frames
python3 tools/readme_demo.py .cache/demo docs/media demo     # title card, pointer, cross-fades → demo.gif / demo.mp4
RANGE=21:31 CARDS=0 python3 tools/readme_demo.py .cache/demo docs/media nudge   # the position-control clip
```
