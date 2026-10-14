#!/usr/bin/env python3
"""compare ref and ours renders by the ink: bbox size and the share of differing pixels after aligning the bboxes (top-left or top-right)
usage: inkdiff.py refdir oursdir names.json [rtl]"""
import sys, json
from PIL import Image
a, b, names = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
rtl = len(sys.argv) > 4
def ink(p):
    im = Image.open(p).convert('L'); W, H = im.size; px = im.load()
    pts = [(x, y) for y in range(24, H - 50) for x in range(8, W - 8) if px[x, y] < 160]
    # drop frame / margin lines: columns/rows that are nearly full height
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return im, (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
res = []
for i in range(1, len(names)):
    ia, ba = ink(f'{a}/{i:02d}.png'); ib, bb = ink(f'{b}/{i:02d}.png')
    wa, ha, wb, hb = ba[2] - ba[0], ba[3] - ba[1], bb[2] - bb[0], bb[3] - bb[1]
    ca, cb = ia.crop(ba), ib.crop(bb)
    if rtl:  # align the right edges
        w = max(wa, wb); h = max(ha, hb)
        A = Image.new('L', (w, h), 255); B = Image.new('L', (w, h), 255)
        A.paste(ca, (w - wa, 0)); B.paste(cb, (w - wb, 0))
    else:
        w = max(wa, wb); h = max(ha, hb)
        A = Image.new('L', (w, h), 255); B = Image.new('L', (w, h), 255)
        A.paste(ca, (0, 0)); B.paste(cb, (0, 0))
    pa, pb = A.load(), B.load()
    n = sum(1 for y in range(h) for x in range(w) if (pa[x, y] < 160) != (pb[x, y] < 160))
    tot = sum(1 for y in range(h) for x in range(w) if pa[x, y] < 160)
    res.append((n / max(tot, 1), i, names[i], (wa / 2, ha / 2), (wb / 2, hb / 2)))
for r in sorted(res, reverse=True)[:int(sys.argv[5]) if len(sys.argv) > 5 else 25]:
    print(f'{r[1]:02d} {r[2]:24s} diff {r[0]:.2f} ref {r[3]} ours {r[4]}')
