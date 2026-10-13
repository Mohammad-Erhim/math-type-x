# Testing and verification

```
npm run typecheck
npm test                      # all suites (bundled with esbuild, run by node:test)
npm test -- stack fuzz        # only test files whose name contains one of the words
FUZZ_SEED=7 FUZZ_SESSIONS=40 FUZZ_STEPS=300 npm test -- fuzz
```

The correctness oracle is the **live reference** (https://www.wiris.com/en/mathtype/). Everything recorded
from it lives in `evidence/` (and `tests/oracle/`), so the suites run offline and deterministically.

## Suites (`tests/`)

| suite | what it checks |
| --- | --- |
| `golden`, `noitalic` | every toolbar control in four editor states (and with Automatic italic off) against recorded MathML |
| `oracle` | typing programs (186) and navigation programs (66) against recorded reference results |
| `modes` | Bold / Italic / Regular text / Automatic-italic-off combined with ~700 controls |
| `context`, `ctxprobe`, `ctxlayout`, `length` | Contextual tab: control sets, apply logic, toggle states, layout, length fields |
| `stack`, `stacklayout`, `stackstrike` | elementary-maths stacks and long division: structure, geometry, strike-through |
| `layout`, `roundtrip`, `templates`, `autoformat`, `rtl` | layout metrics, MathML round trip, templates, autoformat, right-to-left UI |
| `services`, `content`, `server` | converters against reference corpora and the HTTP contract |
| `hand` | handwriting recogniser and stroke simulation |
| `fuzz` | random sessions (typing, keys, controls, undo / redo, modes); after every step caret, selection, MathML round trip, layout and speech must stay valid |

Known, documented gaps are printed rather than asserted: oracle typing 170/186, oracle navigation 53/66
(left-script navigation corner cases), ~104/106 stack layout cases, 298/300 contextual cases. See the
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

## Recording new evidence

1. Write or extend a `tools/probe_*.js` / `tools/sNN.js` script.
2. Store the output under `evidence/` (or `tests/oracle/` for corpora).
3. Add a suite or extend an existing one so the recorded behaviour is asserted offline.
4. Mention intentional deviations in the README.
