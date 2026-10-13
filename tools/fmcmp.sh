#!/bin/bash
# renders the formula set in our build and prints the diff against evidence/ui/formulas_ref
cd "$(dirname "$0")/.."
O=${OUT:-formulas_ours}; R=${REFD:-formulas_ref}; rm -rf evidence/ui/$O; node tools/shot_formulas.js evidence/ui/$O >/dev/null 2>&1
for f in evidence/ui/$R/[0-9][0-9].png; do i=$(basename $f .png); echo -n "$i: "; python3 tools/cmp.py $f evidence/ui/$O/$i.png evidence/ui/$O/cmp_$i.png 1; done
