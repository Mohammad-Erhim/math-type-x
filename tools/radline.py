#!/usr/bin/env python3
"""height of the flat tick of a root with an index (rows of its horizontal run, relative to the baseline of the first letter)
usage: radline.py dir offset names.json  → for each root formula with an index: line y (css px above the baseline), length, index bottom"""
import sys, json
from PIL import Image
d, off, names = sys.argv[1], int(sys.argv[2]), json.load(open(sys.argv[3]))
for i in range(56, 80):
    p = f'{d}/{i - off:02d}.png'
    try: im = Image.open(p).convert('L')
    except Exception: continue
    px = im.load(); W, H = im.size
    # baseline of the first letter: lowest ink row in x 12..28 (device px) below the header
    base = max(y for y in range(18, H) if any(px[x, y] < 170 for x in range(12, 28)))
    runs = []
    for y in range(18, base + 1):
        x = 30
        while x < min(W, 200):
            if px[x, y] < 140:
                s = x
                while x < W and px[x, y] < 140: x += 1
                if 8 <= x - s < 80 and px[s, y + 1] < 140 and px[s, y - 1] >= 140 and s < 70: runs.append((y, s, x - s))
            else: x += 1
    # flat tick: a 2 row thick run; take the lowest such run left of the bar
    rr = [r for r in runs if r[0] < base]
    print(f'{i} {names[i]:24s}', [((base - r[0]) / 2, r[1] / 2, r[2] / 2) for r in rr[-2:]])
