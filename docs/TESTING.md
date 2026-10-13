# Testing and verification

```
npm run typecheck
npm test                      # all suites (bundled with esbuild, run by node:test)
npm test -- stack fuzz        # only test files whose name contains one of the words
FUZZ_SEED=7 FUZZ_SESSIONS=40 FUZZ_STEPS=300 npm test -- fuzz
```

The correctness oracle is the **reference implementation** the specification documents describe. Everything recorded
from it lives in `evidence/` (and `tests/oracle/`), so the suites run offline and deterministically.

## Suites (`tests/`)

| suite | what it checks |
| --- | --- |
| `golden`, `noitalic` | every toolbar control in four editor states (and with Automatic italic off) against recorded MathML |
| `oracle` | typing programs (186) and navigation programs (66) against recorded reference results |
| `modes` | Bold / Italic / Regular text / Automatic-italic-off combined with ~700 controls |
| `context`, `ctxprobe`, `ctxlayout`, `length` | Contextual tab: control sets, apply logic, toggle states, layout, length fields |
| `ctxsets`, `ctxeffects` | Contextual tab against crawls of the real playground: the control set (and toggles) at every caret / selection stop of ~400 formulas, and the MathML of every control clicked at every stop (stacks, long division, fences, operators, multi-line) |
| `stack`, `stacklayout`, `stackstrike` | elementary-maths stacks and long division: structure, geometry, strike-through |
| `layout`, `roundtrip`, `templates`, `autoformat`, `rtl` | layout metrics, MathML round trip, templates, autoformat, right-to-left UI |
| `arfonts`, `export` | the Arabic faces of the Font list (metrics, SVG / PNG / browser export), editor ↔ export details |
| `services`, `content`, `server` | converters against reference corpora and the HTTP contract |
| `hand` | handwriting recogniser: accuracy on three synthetic stroke corpora with the intended MathML as truth (digits, letters, operators, fractions, radicals, scripts, big operators), scribbles give no output |
| `fuzz` | random sessions (typing, keys, controls, undo / redo, modes); after every step caret, selection, MathML round trip, layout and speech must stay valid |

Known, documented gaps are printed rather than asserted: oracle typing 170/186, oracle navigation 53/66
(left-script navigation corner cases), ~104/106 stack layout cases. See the
*Known deviations* section of the README.

## Differential harness (needs Playwright + network access to the reference)

`tools/sNN.js` are scenario scripts (tabs, keyboard, clipboard, matrix picker, pop-ups, contextual tab,
handwriting, touch, …). Each records DOM state, MathML, output panel and requests.

```
npx playwright install chromium
npm run build && PORT=8099 npm start &
bash tools/run_ours.sh s09 s16        # replay scenarios against this build
python3 tools/diff_scn.py s09         # diff with the recording in evidence/scenarios
bash tools/diff_all.sh                # all scenarios
```

`tools/probe_*.js` measure single behaviours on the reference (stack geometry, caret rectangles, hit
positions, toggles, touch handles, …); results are stored as JSON in `evidence/` and consumed by the
test suites. `tools/shot_formulas.js` + `tools/leafshift.py` + `tools/cmp.py` compare rendered ink.

Reference flakiness: the reference service sometimes answers late or with stale panels; probes use waits
≥ 1500 ms and scenarios that flake (s01, s07, s23, s28) are re-run before a difference is believed.

### Contextual-tab crawls

`tools/ctx_matrix.js` walks the caret (or extends a selection) through a list of formulas and records the controls of
the Contextual tab at every stop (`MODE=discover|select`), or additionally clicks every control and records the MathML
and the controls afterwards (`MODE=effects`, `NODEDUPE=1` for every stop). Formulas come from `tools/ctx_cases.js`,
`CASES=file.json`, or toolbar flows (`{flow: ['Matrix with parenthesis', 'type:a']}`). Run it against the reference
(default) and against this build (`URL=http://localhost:8099/?output=0`) and compare with `tools/ctx_diff.py`;
`tools/ctx_compare.sh` replays the stored lists against a running build. `tools/ctx_dump2.js` captures the DOM of
the panel for the layouts (`tools/gen/ctx_layout.py`). The recordings are `evidence/ctx_*_ref.json`; the offline
tests `ctxsets` / `ctxeffects` replay them through the engine (`tools/gen/ctx_sets.ts`, `ctx_replay.ts`,
`ctx_flowsets.ts` do the same from the command line with a readable diff).

## Editor ↔ export and toolbar-art crawls

* `tools/vis_crawl.js` (`TAB=0..8`, optional `LANGUAGE=ar RTL=1`, `CASES=A,A2,B`): inserts every toolbar control and every
  drop-down item into an empty editor, screenshots the formula canvas, fetches the PNG export of the same formula and
  compares the two (ink boxes, 1 px tolerant overlap). A side by side image is written for each render
  (`OUT/<lang>_<id>_<case>.png`); the console lists the ones that differ. Controls that open a dialog / picker show up as
  "flagged" by design.
* `tools/icon_shots.js` + `tools/icon_diff.py` / `tools/icon_ink.py`: toolbar screenshots of every tab and drop-down of
  two builds (reference page vs this one, `LANGUAGE`, `RTL`, `DSF`) and a control-by-control comparison
  (`METRIC=pix` counts differing pixels, `icon_ink.py` the ink ratio).
* `tools/ctx_shots.js`: contextual-panel screenshots at every caret stop for a formula list (compare with a diff tool).
* `tools/png_vs_ref.py`: our PNG export against the reference's own image service for the MathML of a crawl.
* `tools/font_check.js` (`NOLCD=1`): the Arabic faces of the Font list, editor canvas vs PNG export (LTR and RTL).
* `tools/gen/subset_arabic.py` rebuilds the bundled default Arabic face, `tools/gen/subset_arabic_fonts.py` the faces of the Font list; `tools/gen/trace_rtl.py` / `trace_controls.py` re-trace the
  toolbar art (`tracelib.split_dots` keeps the dots of letters).

## Recording new evidence

1. Write or extend a `tools/probe_*.js` / `tools/sNN.js` script.
2. Store the output under `evidence/` (or `tests/oracle/` for corpora).
3. Add a suite or extend an existing one so the recorded behaviour is asserted offline.
4. Mention intentional deviations in the README.
