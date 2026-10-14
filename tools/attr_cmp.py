#!/usr/bin/env python3
"""ink boxes of NN.png in two dirs (shot_formulas output, dsf 2): prints the formulas whose box differs by > 2 px"""
import sys, json, os
from PIL import Image
a, b, fl = sys.argv[1], sys.argv[2], sys.argv[3]
F = json.load(open(fl))
def ink(p):
    im = Image.open(p).convert('RGB')
    w, h = im.size
    im = im.crop((16, 16, w - 4, h - 4))
    # dark, grey pixels only (borders of the editor are light grey, selections / carets coloured)
    g = im.point(lambda v: v).convert('L')
    px = im.load(); m = Image.new('L', im.size, 0); mp = m.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, gg, b = px[x, y]
            if r < 110 and gg < 110 and b < 110: mp[x, y] = 255
    bb = m.getbbox()
    return bb
bad = 0
names = json.load(open(sys.argv[4])) if len(sys.argv) > 4 else None
base = int(os.environ.get('BASE', 0))
rows = []
def box(d, i): return ink(os.path.join(d, f'{i:02d}.png'))
for i, f in enumerate(F):
    pa, pb = os.path.join(a, f'{i:02d}.png'), os.path.join(b, f'{i:02d}.png')
    if not (os.path.exists(pa) and os.path.exists(pb)): print(i, 'missing'); continue
    ba, bb = ink(pa), ink(pb)
    # position relative to the first formula of the set (the two engines place the display slightly differently)
    ra, rb = box(a, base), box(b, base)
    da = tuple(ba[k] - ra[k] for k in range(4)); db = tuple(bb[k] - rb[k] for k in range(4))
    d = tuple((db[k] - da[k]) / 2 for k in range(4))
    ok = max(abs(x) for x in d) <= 1.5
    if not ok: bad += 1
    label = names[i] if names and i < len(names) else f[:70]
    print(('ok   ' if ok else 'DIFF ') + f'{i:02d} {label}'.ljust(60), 'ref-rel', tuple(x // 2 for x in da), 'ours-rel', tuple(x // 2 for x in db))
print(bad, 'differ of', len(F))
# does a variant change the picture at all (against the first formula of its side)?
from PIL import ImageChops
print('--- changes the picture?  (ref / ours)')
for i, f in enumerate(F):
    try:
        def ch(d):
            x = Image.open(os.path.join(d, f'{i:02d}.png')).convert('L').crop((16, 16, 500, 200))
            y = Image.open(os.path.join(d, f'{base:02d}.png')).convert('L').crop((16, 16, 500, 200))
            return ImageChops.difference(x, y).point(lambda v: 255 if v > 60 else 0).getbbox() is not None
        cr, co = ch(a), ch(b)
    except Exception as e:
        continue
    if cr != co:
        label = names[i] if names and i < len(names) else f[:50]
        print(f'  {i:02d} {label}: ref {"changes" if cr else "same"}, ours {"changes" if co else "same"}')
