#!/bin/bash
# renders a FORMULAS list in the reference and in our build and compares the ink boxes.  usage: attr_compare.sh formulas.json outname
cd "$(dirname "$0")/.."
F=$1; N=${2:-attr}
rm -rf .cache/$N/ref .cache/$N/ours; mkdir -p .cache/$N
FORMULAS=$F URL=https://www.wiris.com/en/mathtype/ WAIT=1800 node tools/shot_formulas.js .cache/$N/ref > /dev/null 2>&1
FORMULAS=$F URL='http://localhost:8099/?output=0' WAIT=500 node tools/shot_formulas.js .cache/$N/ours > /dev/null 2>&1
python3 tools/attr_cmp.py .cache/$N/ref .cache/$N/ours $F
