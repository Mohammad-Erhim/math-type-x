#!/bin/bash
# usage: tools/serve.sh start|stop  – runs the built server in the background (pid in .cache/server.pid)
cd "$(dirname "$0")/.."
mkdir -p .cache
case "$1" in
  stop) [ -f .cache/server.pid ] && kill "$(cat .cache/server.pid)" 2>/dev/null; rm -f .cache/server.pid ;;
  start) nohup env PORT="${PORT:-8099}" LOG=off node dist/server.mjs > .cache/server.log 2>&1 & echo $! > .cache/server.pid; sleep 1; cat .cache/server.log ;;
esac
