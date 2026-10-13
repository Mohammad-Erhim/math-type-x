#!/usr/bin/env python3
"""Compare toolbar screenshots of two builds (tools/icon_shots.js) button by button.
usage: icon_diff.py <ref_dir> <ours_dir> <out_dir> [threshold]  → report on stdout, contact sheets in out_dir"""
import sys, os, json
from PIL import Image, ImageChops

ref, ours, out = sys.argv[1:4]
thr = float(sys.argv[4]) if len(sys.argv) > 4 else 6.0
# METRIC=pix: number of pixels that differ by more than 60 levels (small icons: a lost faint stroke or dot shows up)
import os
PIX = os.environ.get('METRIC') == 'pix'
os.makedirs(out, exist_ok=True)
rects = json.load(open(os.path.join(ours, 'rects.json')))
bad = []
total = 0
for key, lst in rects.items():
    fa, fb = os.path.join(ref, key + '.png'), os.path.join(ours, key + '.png')
    if not (os.path.exists(fa) and os.path.exists(fb)):
        continue
    A, B = Image.open(fa).convert('L'), Image.open(fb).convert('L')
    for r in lst:
        if r['w'] < 6 or r['h'] < 6:
            continue
        box = (int(r['x']), int(r['y']), int(r['x'] + r['w']), int(r['y'] + r['h']))
        if box[2] > A.width or box[3] > A.height:
            continue
        ca, cb = A.crop(box), B.crop(box)
        d = ImageChops.difference(ca, cb)
        mad = sum(d.getdata()) / (d.width * d.height)
        if PIX:
            mad = float(sum(1 for v in d.getdata() if v > 60))
        inka = sum(1 for v in ca.getdata() if v < 140)
        inkb = sum(1 for v in cb.getdata() if v < 140)
        total += 1
        if mad >= thr:
            bad.append((mad, key, r.get('title', ''), box, inka, inkb))
bad.sort(reverse=True)
print(f'{len(bad)} of {total} controls differ (mean abs diff >= {thr})')
for m, key, title, box, ia, ib in bad[:60]:
    print(f'{m:6.1f} {key:10s} {box} ink ref/ours {ia}/{ib}  {title}')
# contact sheet of the worst 40: ref on top of ours, 4x
cells = []
for m, key, title, box, ia, ib in bad[:40]:
    A, B = Image.open(os.path.join(ref, key + '.png')).convert('RGB'), Image.open(os.path.join(ours, key + '.png')).convert('RGB')
    ca, cb = A.crop(box), B.crop(box)
    Z = 4
    w, h = ca.width * Z, ca.height * Z
    c = Image.new('RGB', (max(w, 90), h * 2 + 4), (255, 200, 200))
    c.paste(ca.resize((w, h), Image.NEAREST), (0, 0))
    c.paste(cb.resize((w, h), Image.NEAREST), (0, h + 4))
    cells.append(c)
if cells:
    cols = 8
    W = max(c.width for c in cells) + 6
    H = max(c.height for c in cells) + 6
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * W, rows * H), 'white')
    for i, c in enumerate(cells):
        sheet.paste(c, ((i % cols) * W + 3, (i // cols) * H + 3))
    sheet.save(os.path.join(out, 'worst.png'))
