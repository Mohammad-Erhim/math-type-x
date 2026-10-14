#!/usr/bin/env python3
"""right-to-left shots (clipped at the right edge of the editor) → mirrored, cut at the scrollbar and padded so the LTR analysis tools work on them
usage: rtlmirror.py indir outdir"""
import sys, os
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for f in sorted(os.listdir(src)):
    if not f.endswith('.png'): continue
    im = Image.open(f'{src}/{f}').convert('L'); W, H = im.size; px = im.load()
    edge = W
    for x in range(W - 1, 200, -1):
        if sum(1 for y in range(H) if px[x, y] < 235) > H * 0.7: edge = x
    c = im.crop((max(0, edge - 330), 0, edge, H)).transpose(Image.FLIP_LEFT_RIGHT)
    out = Image.new('L', (c.size[0] + 12, H), 255); out.paste(c, (12, 0))
    out.convert('RGB').save(f'{dst}/{f}')
