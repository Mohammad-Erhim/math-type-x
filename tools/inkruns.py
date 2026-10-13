#!/usr/bin/env python3
"""horizontal ink runs of shot_formulas PNGs (dsf 2) of two dirs: inkruns.py ref ours names.json [only-diff]"""
import sys, json
from PIL import Image
a, b, names = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
def runs(p):
    im = Image.open(p).convert('L').crop((10, 10, 600, 200)); w, h = im.size; px = im.load()
    cols = [any(px[x, y] < 150 for y in range(h)) for x in range(w)]
    out = []; s = None
    for x, c in enumerate(cols + [False]):
        if c and s is None: s = x
        if not c and s is not None: out.append((s / 2, (x - 1) / 2)); s = None
    return out
n = 0
for i in range(1, len(names)):
    r = runs(f'{a}/{i:02d}.png'); o = runs(f'{b}/{i:02d}.png')
    ok = len(r) == len(o) and all(abs(p[0] - q[0]) <= 0.5 and abs(p[1] - q[1]) <= 0.5 for p, q in zip(r, o))
    if not ok: n += 1
    if not ok or len(sys.argv) < 5:
        print(i, names[i].ljust(16), 'ref ', r)
        print(' ' * 19, 'ours', o, '' if ok else '  <<< DIFF')
print(n, 'differ')
