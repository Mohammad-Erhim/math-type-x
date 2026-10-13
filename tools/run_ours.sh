#!/bin/bash
# usage: tools/run_ours.sh s02 [s03 ...]   – replays the reference scenario scripts against our build (http://localhost:8099)
cd "$(dirname "$0")/.."
ROOT=$(pwd)
mkdir -p evidence/ours/sc
for s in "$@"; do
  (cd evidence/ours && URL="${URL:-http://localhost:8099/?output=0}" ORIGIN="${ORIGIN:-http://localhost:8099}" NETPAT='editor-services' FORCE_CLICK=1 RESET_WAIT=300 node "$ROOT/tools/$s.js")
done
