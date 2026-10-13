# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] – Unreleased

### Added
- Browser equation editor playground (725 × 415 px): ten-tab toolbar with 700 controls, Contextual tab,
  pop-ups and pickers, special characters, handwriting mode, output panel, SRS 9.2 JavaScript API and events.
- MathML-shaped document model with caret, selection, undo / redo, clipboard, autoformat and the
  Bold / Italic / Regular-text / Automatic-italic modes.
- Layout engine calibrated to the reference: fractions, roots, scripts, fences, matrices, enclosures,
  big operators, elementary-maths stacks and both long-division notations; caret and underline marks.
- Keyboard, mouse and touch interaction (selection handles, double tap), RTL toolbar; the demo page keeps
  the playground visible on small screens (horizontal scroll) instead of hiding it.
- Node service: accessible text, LaTeX, Content MathML, SVG / PNG / PDF / EPS rendering, handwriting
  recognition; strict input validation, rate limit, configurable CORS origins, structured access log.
- Offline converters with the reference's error texts.
- Test suites (golden, oracle, services, layout, fuzz, …), differential harness against the live
  reference, recorded evidence, CI workflow.
- Documentation: SRS and functional reference PDFs, architecture, services, testing.

### Added (behaviour pass)
- Arabic: translated user interface (toolbar, pop-ups, output panel, demo page), right-to-left default, RTL layout with
  mirrored structures and glyphs, Arabic typing classes and function names, Arabic accessible text.
- Handwriting recogniser rebuilt: template matching with segmentation and a structure parser (fractions, radicals, big
  operators, fences, scripts), rejection of scribbles, time-aware stroke grouping, warm-up at server start.
- Contextual tab matches the reference at every caret and selection stop: operator spacing and the new Stretchy toggle,
  nudge buttons with the controls of the enclosing structure for selections, table cell range selection (Delete clears the
  cells), stack / long-division row and line operations (insert line before / after, carries cells, move left / right,
  line ends), carries location memory.
- Enclosure padding per notation (box, circle, strikes, long division sign), placeholder-aware caret navigation.
- Tools: contextual-tab crawler (`tools/ctx_matrix.js`) with comparison and replay helpers, handwriting end-to-end check,
  selection / enclosure probes.

### Added (static deployment)
- The editor works without any server: image export (SVG, PNG, PDF, EPS), handwriting recognition (Web Worker) and the
  converters run in the browser when the services are not there; `npm run build:static`, `vercel.json`,
  `tools/static_e2e.js`, `tests/static.test.ts`.
- `editor.getPDF()` / `editor.getEPS()`; shared SVG / PDF code in `src/render`.

### Added (responsive)
- Fluid layout for narrow / low screens and touch (scrolling tab and panel strips, touch-sized controls, full-window
  editor and handwriting surface, pop-ups kept on screen), `layout` option and `setLayout()`;
  the wide-screen layout is unchanged.

### Changed (editor ↔ export consistency pass)
- One bundled font set (STIX Two Math, Liberation Sans, an Arabic face) for the formula canvas, the toolbar icons and
  every export; the editor no longer loads fonts from another site, so the canvas and the PNG / SVG / PDF agree and
  the browser-side export no longer falls back to wrong glyphs.
- Exported images contain no empty-slot placeholder boxes. Arabic runs are measured as joined text (editor and image
  services alike). Stretched arrows are drawn on the pixel grid (no clipped or stretched heads).
- Fence vertical alignment (contextual tab: Baseline / Middle / Middle-baseline) now changes the layout.
- Arabic / right-to-left toolbar art for the pop-up items, dots of Arabic letters kept in traced icons, real
  handwriting-strip icon, reference grid and keyboard button in handwriting mode, reference hover / pressed / focus
  states of buttons and expanders, toolbar selects.
- The demo page is exactly as high as the window (no page scroll, output panel always visible); no full-screen button.
- Touch screens get a small ◀ ▲ ▼ ▶ pad in the formula area (soft keyboards have no arrow keys, so a numerator could not
  be left for the denominator, a script exited, …).
- Brand-neutral naming: no third-party site links or names in the product, help page shipped with the editor.

### Known deviations
See *Known deviations* in the [README](README.md).
