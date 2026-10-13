#!/bin/bash
# visual audit of every control on formulas whose rendering can show the effect: reference and ours side by side
# → .cache/vis/ref/<case>/…, .cache/vis/ours/<case>/…   (compare: tools/ctx_vis_diff.py)
cd "$(dirname "$0")/.."
for side in ours ref; do
  env CASES=evidence/ctx_cases_vis.json OUT=.cache/vis/$side ${ONLY:+ONLY=$ONLY} $( [ $side = ref ] && echo REF=1 ) node tools/ctx_audit.js
done
