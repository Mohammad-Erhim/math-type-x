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
- Keyboard, mouse and touch interaction (selection handles, double tap), RTL toolbar.
- Node service: accessible text, LaTeX, Content MathML, SVG / PNG / PDF / EPS rendering, handwriting
  recognition; strict input validation, rate limit, configurable CORS origins, structured access log.
- Offline converters with the reference's error texts.
- Test suites (golden, oracle, services, layout, fuzz, …), differential harness against the live
  reference, recorded evidence, CI workflow.
- Documentation: SRS and functional reference PDFs, architecture, services, testing.

### Known deviations
See *Known deviations* in the [README](README.md).
