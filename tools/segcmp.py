#!/usr/bin/env python3
"""long line segments (frames, rules) of two shot_formulas dirs, relative to each side's first leaf 'y'/'1' – prints both"""
import sys, json, subprocess
a, b, fl = sys.argv[1:4]
names = json.load(open(sys.argv[4])) if len(sys.argv) > 4 else None
MIN = float(sys.argv[5]) if len(sys.argv) > 5 else 14
from PIL import Image
def segs_all(d, i, mn):
    global MIN
    old = MIN; MIN = mn
    try: return segs(d, i)
    finally: MIN = old
def segs(d, i):
    im = Image.open(f'{d}/{i:02d}.png').convert('L'); W, H = im.size; px = im.load()
    dark = lambda x, y: px[x, y] < 150
    out = []
    for y in range(2, H - 2):
        x = 2
        while x < W - 2:
            if dark(x, y):
                x0 = x
                while x < W - 2 and dark(x, y): x += 1
                if (x - x0) / 2 >= MIN:
                    ab = sum(dark(xx, y - 2) for xx in range(x0, x)); be = sum(dark(xx, y + 2) for xx in range(x0, x))
                    if ab < (x - x0) * .3 and be < (x - x0) * .3: out.append(['h', y / 2, x0 / 2, x / 2])
            else: x += 1
    for x in range(2, W - 2):
        y = 2
        while y < H - 2:
            if dark(x, y):
                y0 = y
                while y < H - 2 and dark(x, y): y += 1
                if (y - y0) / 2 >= MIN:
                    l = sum(dark(x - 2, yy) for yy in range(y0, y)); r = sum(dark(x + 2, yy) for yy in range(y0, y))
                    if l < (y - y0) * .3 and r < (y - y0) * .3: out.append(['v', x / 2, y0 / 2, y / 2])
            else: y += 1
    # merge adjacent device rows of one css line
    m = []
    for s in out:
        if m and m[-1][0] == s[0] and abs(m[-1][1] - s[1]) <= 0.6 and m[-1][2] == s[2] and m[-1][3] == s[3]: continue
        m.append(s)
    return m
def anchor(d, i):
    # the first leaf '1' (top-left of the first digit of the table) – same DOM-measured box in both engines
    for t, x, y, w, h in json.load(open(f'{d}/{i:02d}.json'))['leaves']:
        if t == '1': return x, y
    return 0, 0
n = len(json.load(open(fl)))
for i in range(n):
    try:
        sa, sb = segs(a, i), segs(b, i)
    except Exception: continue
    aa, ab = anchor(a, i), anchor(b, i)
    ra = sorted([s[0], round(s[1] - (aa[0] if s[0] == 'v' else aa[1]), 1), round(s[2] - (aa[1] if s[0] == 'v' else aa[0]), 1), round(s[3] - (aa[1] if s[0] == 'v' else aa[0]), 1)] for s in sa)
    rb = sorted([s[0], round(s[1] - (ab[0] if s[0] == 'v' else ab[1]), 1), round(s[2] - (ab[1] if s[0] == 'v' else ab[0]), 1), round(s[3] - (ab[1] if s[0] == 'v' else ab[0]), 1)] for s in sb)
    if ra != rb:
        print(f'DIFF {i:02d} {names[i] if names else ""}')
        print('   ref ', ra)
        print('   ours', rb)
print('done')
