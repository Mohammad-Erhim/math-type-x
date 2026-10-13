#!/bin/bash
# summary of differential results for every scenario that has both a reference and a local run
cd "$(dirname "$0")/.."
for f in evidence/scenarios/s*.json; do
  n=$(basename $f .json)
  [ -f evidence/ours/sc/$n.json ] || continue
  python3 tools/diff_scn.py $n 2>/dev/null | tail -1 | sed "s/^/$n: /"
done
