#!/bin/bash
# usage: SEED=3 N=300 bash tools/fuzz_speech.sh   – differential fuzzing of the spoken text against the reference
cd "$(dirname "$0")/.."
node -e "require('esbuild').buildSync({entryPoints:['tools/fuzz_speech.ts'],bundle:true,platform:'node',format:'esm',outfile:'.build/fuzz_speech.mjs',loader:{'.json':'json'},banner:{js:\"import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);\"}})" && node .build/fuzz_speech.mjs
