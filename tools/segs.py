#!/usr/bin/env python3
"""thin dark line segments of a shot_formulas PNG (dsf 2) in 1x coordinates, relative to the formula's first leaf:
usage: segs.py dir idx [json]  → prints leaves and horizontal / vertical segments"""
import sys, json
from PIL import Image
d, i = sys.argv[1], int(sys.argv[2])
im = Image.open(f'{d}/{i:02d}.png').convert('L'); W, H = im.size
px = im.load()
dark = lambda x, y: px[x, y] < 140
lv = json.load(open(f'{d}/{i:02d}.json'))['leaves']
segs = []
# horizontal runs (≥ 12 px at 2x) on rows where the pixels above and below are light (thin line)
for y in range(2, H - 2):
    x = 2
    while x < W - 2:
        if dark(x, y):
            x0 = x
            while x < W - 2 and dark(x, y): x += 1
            if x - x0 >= 12:
                # thin: both neighbours above / below mostly light
                above = sum(dark(xx, y - 2) for xx in range(x0, x)); below = sum(dark(xx, y + 2) for xx in range(x0, x))
                if above < (x - x0) * 0.3 and below < (x - x0) * 0.3: segs.append(('h', y / 2, x0 / 2, x / 2))
        else: x += 1
for x in range(2, W - 2):
    y = 2
    while y < H - 2:
        if dark(x, y):
            y0 = y
            while y < H - 2 and dark(x, y): y += 1
            if y - y0 >= 12:
                l = sum(dark(x - 2, yy) for yy in range(y0, y)); r = sum(dark(x + 2, yy) for yy in range(y0, y))
                if l < (y - y0) * 0.3 and r < (y - y0) * 0.3: segs.append(('v', x / 2, y0 / 2, y / 2))
        else: y += 1
# merge consecutive rows/cols of the same segment
out = []
for s in segs:
    if out and out[-1][0] == s[0] and abs(out[-1][1] - s[1]) <= 1 and out[-1][2] == s[2] and out[-1][3] == s[3]: continue
    out.append(s)
print('leaves', [(l[0], l[1], l[2], round(l[3], 1), l[4]) for l in lv if l[0] in '1234yz+='])
for s in out: print(s)
