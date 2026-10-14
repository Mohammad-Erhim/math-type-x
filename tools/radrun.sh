#!/bin/bash
# rebuild, restart the server and render the sqrt / root formulas of .cache/ir.json into .cache/ir_rad/ours; compare with the reference
cd "$(dirname "$0")/.."
node tools/build.mjs >/dev/null 2>&1 || { echo build failed; exit 1; }
[ -f .cache/server.pid ] && kill "$(cat .cache/server.pid)" 2>/dev/null; sleep 1
RATE_LIMIT=1000000 tools/serve.sh start >/dev/null
rm -rf .cache/ir_rad/ours
FORMULAS=.cache/ir_rad.json URL="http://localhost:8099/?output=0" WAIT=${WAIT:-1000} node tools/shot_formulas.js .cache/ir_rad/ours >/dev/null 2>&1
python3 tools/radsign.py .cache/ir/ref .cache/ir_rad/ours .cache/ir_names.json 45
