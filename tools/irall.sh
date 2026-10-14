#!/bin/bash
# rebuild + restart server, then render all root / integral formulas (LTR and RTL) of ours into .cache/ir/ours and .cache/ir_rtl/ours
cd "$(dirname "$0")/.."
node tools/build.mjs >/dev/null 2>&1 || { echo build failed; exit 1; }
[ -f .cache/server.pid ] && kill "$(cat .cache/server.pid)" 2>/dev/null; sleep 1
RATE_LIMIT=1000000 tools/serve.sh start >/dev/null
rm -rf .cache/ir/ours .cache/ir_rtl/ours
FORMULAS=.cache/ir.json URL="http://localhost:8099/?output=0" WAIT=${WAIT:-1000} node tools/shot_formulas.js .cache/ir/ours >/dev/null 2>&1
CLIPRIGHT=1 FORMULAS=.cache/ir_rtl.json URL="http://localhost:8099/?output=0" WAIT=${WAIT:-1000} node tools/shot_formulas.js .cache/ir_rtl/ours >/dev/null 2>&1
echo finished
