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

### Known deviations
See *Known deviations* in the [README](README.md).
