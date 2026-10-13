#!/usr/bin/env python3
"""Ink ratio (ours / reference) of every toolbar icon of two icon_shots runs: python3 tools/icon_ink.py ref_dir ours_dir [n_worst]"""
import json, os, sys, statistics
from PIL import Image
ref, ours = sys.argv[1:3]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 15
rects = json.load(open(ours + '/rects.json'))
rows = []
for key, lst in rects.items():
    fa, fb = f'{ref}/{key}.png', f'{ours}/{key}.png'
    if not (os.path.exists(fa) and os.path.exists(fb)):
        continue
    A, B = Image.open(fa).convert('L'), Image.open(fb).convert('L')
    for r in lst:
        if r['w'] < 8:
            continue
        box = (int(r['x']), int(r['y']), int(r['x'] + r['w']), int(r['y'] + r['h']))
        if box[2] > A.width or box[3] > A.height:
            continue
        ia = sum((255 - v) / 255 for v in A.crop(box).getdata() if v < 190)
        ib = sum((255 - v) / 255 for v in B.crop(box).getdata() if v < 190)
        if ia >= 8:
            rows.append((ib / ia, key, r.get('title', ''), ia, ib))
rat = [r[0] for r in rows]
print('controls', len(rows), 'median ratio %.3f' % statistics.median(rat), 'p10 %.3f p90 %.3f' % (sorted(rat)[len(rat) // 10], sorted(rat)[len(rat) * 9 // 10]))
rows.sort()
for r in rows[:n]:
    print('%.2f %-10s %s' % (r[0], r[1], r[2]))
