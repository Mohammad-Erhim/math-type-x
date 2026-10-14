#!/usr/bin/env python3
"""radical sign ink box (relative to the first letter's ink left / baseline) for the sqrt / root formulas: ref vs ours.
usage: radsign.py refdir oursdir names.json [ours-index-offset]   (ours dir may hold only a subset: file k = formula k+offset)"""
import sys, json
src = open(__file__.replace('radsign.py', 'touch_check.py')).read().split('bad = 0')[0]
sys.argv, args = ['x', sys.argv[1], sys.argv[3]], sys.argv[1:]
exec(src)
ref, ours, names = args[0], args[1], json.load(open(args[2]))
off = int(args[3]) if len(args) > 3 else 0
def sign(path):
    c = [b for b in comps(path) if b[2] - b[0] < 400 and b[3] - b[1] > 4 and b[0] > 3]
    a = c[0]; base = a[3]
    sg = max(c, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]) if b[2] - b[0] > 12 else 0)
    n = sum(1 for b in c if b[0] >= a[0])
    return (round(sg[0] - a[0], 1), round(sg[1] - base, 1), round(sg[2] - a[0], 1), round(sg[3] - base, 1)), n
for i in range(1, len(names)):
    if not any(k in names[i] for k in ('sqrt', 'root')): continue
    import os
    po = f'{ours}/{i - off:02d}.png'
    if not os.path.exists(po): continue
    r, rn = sign(f'{ref}/{i:02d}.png'); o, on = sign(po)
    d = tuple(round(o[k] - r[k], 1) for k in range(4))
    print(f'{i:02d} {names[i]:24s} ref {r} ours {o} diff {d} comps {rn}/{on}')
