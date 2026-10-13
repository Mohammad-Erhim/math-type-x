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
- Narrow windows (phones, tablets, landscape phones): no sideways scrolling – the tabs share one row and the controls of a
  tab wrap into rows (each group's arrow stays with it), pop-ups open under the tapped arrow; a clear-formula button with
  confirmation joins the touch pad; the contextual tab is disabled (greyed) while the caret has no options; leaving the
  page with a formula in it asks first; handwriting is switched off in the demo (`?detectHand=true` brings it back);
  the limit of a right-to-left formula is the Arabic word نها.
- Brand-neutral naming: no third-party site links or names in the product.
- The manual link, its icon, the `manualUrl` option and the help page are gone.

### Added (Arabic fonts)
- The Font list has a group of Arabic fonts (Noto Naskh Arabic, Noto Sans Arabic, Noto Kufi Arabic, Tajawal; SIL OFL):
  entries are drawn in their face with their name in Arabic script, the closed list shows that name in the face.
  Arabic letters, digits and punctuation are set in the chosen face in the editor and in the PNG / SVG / PDF / EPS
  exports (browser and server); Latin letters, digits and operators keep their faces, so nothing else moves.
- Subset fonts (woff2 for browsers, loaded only when used; ttf for the image services) from
  `tools/gen/subset_arabic_fonts.py`; the image services measure Arabic runs with HarfBuzz (`harfbuzzjs`) in each face.
- `tools/font_check.js` compares editor and PNG for every face, `tests/arfonts.test.ts`.

### Added (state, output, Arabic details)
- The demo keeps its state in the browser (local storage, `persist` option / `?persist=0` to switch off): the formula with its
  font family, size and direction, the active tab, the typing modes (bold, italic, regular text, digits, …) and the output
  format. A reload, closed tab or swipe back loses nothing; unreadable or foreign records are ignored (`src/ui/persist.ts`).
- Output panel: results are made once typing pauses (120 ms for local formats, 350 ms for service formats), the running
  request is cancelled the moment the formula changes, the shown output is dimmed ("Updating…") instead of flashing a
  skeleton, an answer for an older formula is never shown (checked again when it arrives), results of the last 10 formulas /
  formats are cached, and nothing is made while the page is hidden.
- Arabic languages type Arabic-Indic digits by default (Persian / Pashto / Urdu: Eastern Arabic-Indic); numbers a control
  brings along (the exponent of an inverse function) follow the digit set.
- Bold / Italic on a joined Arabic word keeps the word one run (the letters stay joined).
- Touch pad: backspace key (repeats while held, mirrored in right-to-left formulas), clear is a separate red button.

### Added (Arabic math symbols, mobile)
- **Arabic math letters** (الحروف): the letters of the Zulfi Math symbol tables are in the *Insert special characters* dialog
  (category "Arabic math symbols → Letters"; first in an Arabic editor). They are vector shapes extracted from the fonts
  (`tools/gen/zulfi/extract.py`, data in `src/data/zulfi.json`), private-use characters U+E100… in the formula, drawn as
  paths in the editor and in every export: no font is shipped for them. The other tables (operations, relations, …) were
  extracted too and removed again at the owner's request (`tools/gen/zulfi/categories.json` lists what ships).
- **Vertical alignment of structures with inputs** (extension of the contextual tab): fractions, roots, scripts, limits, big
  operators and enclosures offer Baseline / Middle / Middle-baseline (`wrs:valign`, like the fence); the default is the
  reference's position, so existing formulas do not move. The bare engine keeps the reference's contextual tab
  (`EditorCore.contextExtras`, switched on by the editor).
- Arabic language: the differential d of the calculus controls (and their icons) is the Arabic math letter ء.
- Mobile: long press selects, the clear confirmation is a centred modal, the page declares `color-scheme: only light`
  (no forced dark mode), PNGs of the output panel are opaque white.
- History group beside the arrows (Undo / Redo, greyed when there is nothing to go back / forward to, shortcuts in the
  tooltips): Ctrl+Z (Cmd+Z), Ctrl+Y and — new — Ctrl+Shift+Z (Cmd+Shift+Z) redo.
- Narrow windows: the controls keep their size on every device; the panel is a short window (CSS height that follows the
  screen, scrolls) with scroll cues (fade, "More" / arrows, thin scrollbar, IntersectionObserver – no scroll listener).
  A soft keyboard does not relayout the widget (height-only changes are ignored, resize events coalesced per frame), the
  export section folds away when it opens and the keyboard goes away when export is opened; the MathML text, the saved
  copy and the change event are made once taps pause.
- Phones: the export section sits behind an "Export" bar at the bottom (remembered); a low window (soft keyboard) keeps
  tabs, panel, formula, pad and export visible; "Keys" button puts the phone keyboard away; labelled pad keys; tab name above
  the panel; hint in an empty formula; Share (system share sheet); caret positions inside joined Arabic words.

### Known deviations
See *Known deviations* in the [README](README.md).
