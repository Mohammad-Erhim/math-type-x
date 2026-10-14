#!/usr/bin/env python3
"""compare leaf positions of two shot_formulas dirs relative to a base formula: leafcmp.py ref ours formulas.json [names.json] [base]
leaf text (first occurrence of each) → (dx, dy) against the base on both sides; prints variants where the two sides move differently"""
import sys, json, os
a, b, fl = sys.argv[1:4]
names = json.load(open(sys.argv[4])) if len(sys.argv) > 4 and os.path.exists(sys.argv[4]) else None
base = int(sys.argv[5]) if len(sys.argv) > 5 else 1
F = json.load(open(fl))
def leaves(d, i):
    try: lv = json.load(open(f'{d}/{i:02d}.json'))['leaves']
    except Exception: return {}
    out = {}
    for t, x, y, w, h in lv:
        k = t
        n = 0
        while (k, n) in out: n += 1
        out[(t, n)] = (x, y)
    return out
ba, bb = leaves(a, base), leaves(b, base)
bad = 0
for i in range(len(F)):
    la, lb = leaves(a, i), leaves(b, i)
    diffs = []
    for k in la:
        if k in lb and k in ba and k in bb:
            da = (la[k][0] - ba[k][0], la[k][1] - ba[k][1]); db = (lb[k][0] - bb[k][0], lb[k][1] - bb[k][1])
            if abs(da[0] - db[0]) > 1 or abs(da[1] - db[1]) > 1: diffs.append((k[0], da, db))
    missing = 0
    lab = names[i] if names and i < len(names) else F[i][:60]
    if diffs or missing:
        bad += 1
        print(f'DIFF {i:02d} {lab}  leaves ref {len(la)} ours {len(lb)}')
        for d in diffs[:6]: print('      ', d[0], 'ref', d[1], 'ours', d[2])
print(bad, 'variants differ of', len(F))
