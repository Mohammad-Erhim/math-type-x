#!/usr/bin/env python3
"""ink components of shot_formulas PNGs (dsf 2): does an integral / radical sign touch another glyph? prints formulas where the
sign's component is merged with something (width / height much bigger than the sign alone) or closer than 1 px.
usage: touch_check.py dir names.json [first-index]"""
import sys, json
from PIL import Image
d, names = sys.argv[1], json.load(open(sys.argv[2]))
def comps(p, top=9):
    im = Image.open(p).convert('L'); W, H = im.size; px = im.load(); seen = set(); out = []
    for x0 in range(W):
        for y0 in range(top * 2, H):
            if px[x0, y0] < 170 and (x0, y0) not in seen:
                st = [(x0, y0)]; seen.add((x0, y0)); xs = [x0, x0]; ys = [y0, y0]; n = 0
                while st:
                    x, y = st.pop(); n += 1
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            a, b = x + dx, y + dy
                            if 0 <= a < W and top * 2 <= b < H and (a, b) not in seen and px[a, b] < 170:
                                seen.add((a, b)); st.append((a, b)); xs[0] = min(xs[0], a); xs[1] = max(xs[1], a); ys[0] = min(ys[0], b); ys[1] = max(ys[1], b)
                out.append([xs[0] / 2, ys[0] / 2, (xs[1] + 1) / 2, (ys[1] + 1) / 2, n])
    return sorted(out)
bad = 0
for i in range(1, len(names)):
    n = names[i]
    if not any(k in n for k in ('int', 'double', 'contour', 'surface', 'triple', 'volume', 'sqrt', 'root')): continue
    c = [b for b in comps(f'{d}/{i:02d}.png') if b[2] - b[0] < 400 and b[3] - b[1] > 4]   # drop the frame lines
    sign = None
    if 'sqrt' in n or 'root' in n:
        # the radical sign + bar is the widest component starting after the first letter 'a'
        cand = [b for b in c if b[0] > 8 and b[2] - b[0] > 12 and b[3] - b[1] > 14]
        sign = max(cand, key=lambda b: b[2] - b[0]) if cand else None
        merged = sign and any(o is not sign and o[0] >= sign[0] - 0.5 and o[2] <= sign[2] + 0.5 and o[1] >= sign[1] - 0.5 and False for o in c)
        # touching: a glyph (not inside the sign's own box) within 1 px of the sign's left stroke or bar
        close = []
        if sign:
            for o in c:
                if o is sign: continue
                gapx = max(o[0] - sign[2], sign[0] - o[2])
                gapy = max(o[1] - sign[3], sign[1] - o[3])
                if max(gapx, gapy) < 1 and not (o[0] >= sign[0] and o[2] <= sign[2] and o[1] > sign[1] + 1):
                    close.append(o)
        if close: bad += 1; print('TOUCH', i, n, 'sign', sign[:4], 'with', [x[:4] for x in close][:3])
    else:
        cand = [b for b in c if b[0] > 8 and b[3] - b[1] >= 24]
        if not cand: continue
        sign = cand[0]
        w = sign[2] - sign[0]
        if w > 17:
            bad += 1; print('MERGED', i, n, 'sign', sign[:4], 'width', w)
print(bad, 'problems')
