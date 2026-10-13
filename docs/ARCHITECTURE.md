# Architecture

The playground is a browser widget (`src/`) plus a small Node service (`server/`). The widget works
offline for editing; the service provides conversions, rendering and handwriting recognition, and the
widget falls back to local converters when it cannot reach it.

```
 keyboard / mouse / touch / handwriting
            │
        src/ui  ──────────────►  toolbar, display, pop-ups, output panel, services client
            │  commands
        src/core  EditorCore ──► document model (MathML-shaped tree) + caret + selection + undo
            │  tree
        src/layout ───────────►  Box tree → SVG, geometry (hit test, caret rectangle)
            │
        src/convert ──────────►  MathML ⇄ accessible text / LaTeX / Content MathML
            │
        server/  ◄── HTTP ──── services client (src/ui/services.ts)
```

## Document model (`src/core`)

* **`model.ts`, `mathml.ts`** – the formula is a MathML-shaped tree (`El { t, a, x?, c?, cols?, g?, up? }`):
  `t` tag, `a` attributes, `c` children. Text is held one token per character; tokens that came from one
  typed unit share a group id `g`, so multi-character operators / identifiers behave as one.
  `mathml.ts` parses and serialises (strict, round-trips every string the reference produced).
* **`engine.ts` – `EditorCore`** – caret (`path` + `index`), selection, insertion, deletion, navigation
  (horizontal, vertical via `DocGeometry`, stack / table aware), undo / redo, clipboard.
  Every state change ends in `sanitize()`, so caret and selection are always valid for the tree.
* **`typing.ts`, `modestyle.ts`** – autoformat (identifiers, numbers, operators, functions) and the
  Bold / Italic / Regular-text / Automatic-italic modes.
* **`keys.ts`, `templates.ts`, `catalogue.ts`** – keyboard map, structure templates (fractions, roots,
  matrices, …) and the catalogue of the 700 toolbar controls.
* **`context.ts`** – the *Contextual* tab: `locate()` finds the table / stack / fence / operator under the
  caret, `controlsFor()` lists its controls, `applyContext()` and `ctxValue()` apply them and read their
  toggled state (matrix and table attributes, relation alignment, elementary-maths stacks, …).

## Layout and rendering (`src/layout`)

* **`layout.ts`** – turns the tree into a `Box { w, a, d, items, kids, row meta }` tree. Metrics are
  calibrated to the reference (`src/data/metrics.json`, `ref-metrics.json`). Includes the elementary-maths
  stack (`mstack`, `msgroup`, `msrow`, `mscarries`, `msline`) and both long-division notations
  (`mlongdiv`). Row meta carries what the caret needs (baseline stops, lifts, underline runs).
* **`svg.ts`** – Box tree → SVG (also used by the server to render PNG / PDF / EPS).
* **`geometry.ts`** – `DocGeometry`: caret positions, vertical navigation, hit testing.
* **`glyphs.ts`, `metrics.ts`** – glyph and font metric access.

## UI (`src/ui`)

* **`editor.ts`** – the public `JsEditor` API (SRS 9.2) and event wiring.
* **`toolbar.ts`** – ten tabs, pop-ups, pickers, the *More* expander, keyboard focus handling.
* **`display.ts`** – formula view, caret and selection, the grey underline mark, selection handles
  for touch, hit testing.
* **`hand.ts`** – handwriting mode (strokes, recogniser round trip, demo).
* **`output.ts`** – optional output panel (MathML, LaTeX, accessible text, image).
* **`services.ts`** – client for the HTTP services with local fallbacks that reproduce the reference's
  error texts.

## Converters (`src/convert`)

`speech.ts` (accessible text, localised), `accessible.ts` (text → MathML), `latex.ts` / `tex.ts`
(MathML → LaTeX, LaTeX → MathML, with the reference's refusals), `content.ts` (Presentation ⇄ Content
MathML), `xml.ts` / `util.ts` (strict XML helpers).

## Handwriting (`src/hand`)

Stroke font and Hershey data to synthesise strokes (`simulate.ts`, demo) and a compact recogniser
(`recognize.ts`) for digits, a few letters, operators, fractions and scripts. The service contract is
independent of the recogniser, so a stronger provider can be dropped in.

## Server (`server/`)

`index.ts` implements the app (`createApp(config)`): service dispatch, validation, rate limiting, static
hosting of `dist/public`, `/healthz`. `render.ts` and `pdf.ts` draw SVG / PNG (resvg) / PDF / EPS from the
shared layout code; `font.ts` loads the symbol fonts. `main.ts` starts it from environment variables.
See [SERVICES.md](SERVICES.md).

## Build

`tools/build.mjs` (esbuild): `src/main.ts` → `dist/public/editor.js` (IIFE, exposes
`com.wiris.jsEditor.JsEditor` and `MathTypeX`), `server/main.ts` → `dist/server.mjs`. The finished build is
swapped into `dist/` in one rename so a running server never serves a half-written bundle.

## Generated data (`src/data`, `tools/gen`)

Catalogue, toolbar layout, icons, metrics and contextual-tab layouts are generated from the reference
crawl in `evidence/` by the scripts in `tools/gen/` (`build_catalogue.py`, `build_metrics.mjs`,
`ctx_layout.py`, …). They are committed so a plain `npm run build` needs no browser or network.
