#!/usr/bin/env python3
"""leaf positions relative to the first leaf 'a' of every formula: ref vs ours; prints formulas whose leaves differ > tol"""
import sys, json
a, b, names = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
tol = float(sys.argv[4]) if len(sys.argv) > 4 else 1.5
def leaves(d, i):
    lv = json.load(open(f'{d}/{i:02d}.json'))['leaves']
    o = next(((l[1], l[2]) for l in lv if l[0] == 'a'), (0, 0))
    out = []
    for t, x, y, w, h in lv:
        out.append((t, x - o[0], y - o[1], w, h))
    return out
bad = 0
for i in range(1, len(names)):
    la, lb = leaves(a, i), leaves(b, i)
    row = []
    # match by order of leaves with the same text
    pa = {}
    for t, x, y, w, h in la: pa.setdefault(t, []).append((x, y, w, h))
    pb = {}
    for t, x, y, w, h in lb: pb.setdefault(t, []).append((x, y, w, h))
    for t in pa:
        for k, (x, y, w, h) in enumerate(pa[t]):
            if t in pb and k < len(pb[t]):
                x2, y2, w2, h2 = pb[t][k]
                if abs(x - x2) > tol or abs(y - y2) > tol: row.append(f'{t}: ref ({x:.0f},{y:.0f}) ours ({x2:.0f},{y2:.0f})')
    if row or len(la) != len(lb):
        bad += 1
        print(f'DIFF {i:02d} {names[i]}  leaves {len(la)}/{len(lb)}'); [print('     ', r) for r in row[:6]]
print(bad, 'of', len(names) - 1, 'differ')
