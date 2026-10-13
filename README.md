# MathType-X – web equation editor playground

A re-implementation of the MathType web playground ("See MathType in action!"): a 725 × 415 px
equation editor with the full toolbar (700 controls, 10 tabs), the contextual tab, pop-ups, pickers,
handwriting mode and the backend services behind them. It follows the two reference documents in `docs/`
(`MathType_Playground_SRS.pdf`, `MathType_Playground_Functional_Reference.pdf`) and was verified against
the live reference with recorded oracle corpora.

```
npm install
npm run build            # → dist/public (editor.js, demo page, font) and dist/server.mjs
npm start                # http://localhost:8080  (services under /editor-services/)
npm test                 # unit + golden + oracle suites
```

Documentation: [`docs/`](docs/README.md) – [architecture](docs/ARCHITECTURE.md), [services](docs/SERVICES.md),
[testing](docs/TESTING.md); [changelog](CHANGELOG.md); [contributing](CONTRIBUTING.md). Requires Node ≥ 22.

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
  const editor = com.wiris.jsEditor.JsEditor.newInstance({ language: 'en', services: { baseUrl: '/editor-services/' } });
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
* `tests/ctxprobe.test.ts`, `tests/context.test.ts` – contextual-tab control sets and apply logic (60/60, 298/300).
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
* Mouse clicks next to a structure (in the gap between its rows, right of a fraction) use the nearest row; the reference
  uses its own, less regular rule there.
* The reference's conversion services answer a number of formulas with "Error converting …"; the ones seen in the
  recordings are reproduced (`tests/oracle/services_stack.json`), others are converted normally.
* Formula glyphs use Liberation Sans / the reference symbol fonts (`fontsUrl`); without the vendor fonts brackets fall back
  to STIX glyphs.
* The handwriting recogniser is a compact built-in engine (digits, a few letters, operators, fractions, scripts);
  replace `hand/recognize` with a stronger provider if needed – the response contract is unchanged.
* The demo page keeps the playground visible at every viewport width (the reference host page hides it below 1275 px,
  UI-012); on narrow screens the page scrolls horizontally.
* Disabled toolbar buttons expose `aria-disabled` (SRS ACC-001) which the reference does not.
