#!/bin/bash
# records the effect of every contextual control (every option of a select) in the REAL playground for all case sets →
# evidence/ctx_fx_all_<set>_ref.json (replayed offline by tests/ctxeffects_all.test.ts).  Long (≈ 1–2 h): run in background.
cd "$(dirname "$0")/.."
run() { # set cases-file extra-env
  local set=$1 cases=$2 sel=$3
  env MODE=effects ${sel:+SELECT=1} ${cases:+CASES=$cases} OUT=evidence/ctx_fx_all_${set}_ref.json node tools/ctx_matrix.js
}
run cases ""
run adj evidence/ctx_cases_adj.json
run enc evidence/ctx_cases_enc.json
run sel evidence/ctx_cases_sel.json 1
run sel2 evidence/ctx_cases_sel2.json 1
