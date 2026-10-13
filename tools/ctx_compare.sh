#!/bin/bash
# replays the contextual-tab crawls against OUR build (server on :8099) and diffs them with the recorded reference runs
# usage: tools/ctx_compare.sh [discover adj flows sel sel2 enc]   (default: all)
cd "$(dirname "$0")/.."
U='http://localhost:8099/?output=0'
mkdir -p .cache/ctx
sets="${@:-discover adj flows sel sel2 enc}"
for s in $sets; do
  case $s in
    discover) MODE=discover OUT=.cache/ctx/discover.json URL=$U node tools/ctx_matrix.js >/dev/null 2>&1; python3 tools/ctx_diff.py evidence/ctx_discover_ref.json .cache/ctx/discover.json | tail -${TAIL:-25} ;;
    adj)      MODE=discover CASES=evidence/ctx_cases_adj.json OUT=.cache/ctx/adj.json URL=$U node tools/ctx_matrix.js >/dev/null 2>&1; python3 tools/ctx_diff.py evidence/ctx_adj_ref.json .cache/ctx/adj.json | tail -${TAIL:-25} ;;
    flows)    MODE=discover CASES=evidence/ctx_cases_flows.json OUT=.cache/ctx/flows.json URL=$U node tools/ctx_matrix.js >/dev/null 2>&1; python3 tools/ctx_diff.py evidence/ctx_flows_ref.json .cache/ctx/flows.json | tail -${TAIL:-25} ;;
    sel)      MODE=select CASES=evidence/ctx_cases_sel.json OUT=.cache/ctx/sel.json URL=$U node tools/ctx_matrix.js >/dev/null 2>&1; python3 tools/ctx_diff.py evidence/ctx_sel_ref.json .cache/ctx/sel.json | tail -${TAIL:-25} ;;
    sel2)     MODE=select CASES=evidence/ctx_cases_sel2.json OUT=.cache/ctx/sel2.json URL=$U node tools/ctx_matrix.js >/dev/null 2>&1; python3 tools/ctx_diff.py evidence/ctx_sel2_ref.json .cache/ctx/sel2.json | tail -${TAIL:-25} ;;
    enc)      MODE=discover CASES=evidence/ctx_cases_enc.json OUT=.cache/ctx/enc.json URL=$U node tools/ctx_matrix.js >/dev/null 2>&1; python3 tools/ctx_diff.py evidence/ctx_enc_ref.json .cache/ctx/enc.json | tail -${TAIL:-25} ;;
  esac
done
