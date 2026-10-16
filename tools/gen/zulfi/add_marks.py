#!/usr/bin/env python3
"""Adds the Arabic derivative marks to src/data/zulfi.json: the tilted bar that stands above the letter in the glyph U+E124
(first contour of its path) as a symbol of its own, once, twice and three times stacked one above the other (first, second,
third derivative). Stacking more is done in the editor (one mark above another, or above a letter, with the accent / script
structures), so the symbols are plain letters (mi) that sit on the baseline like every other raised form.
usage: python3 tools/gen/zulfi/add_marks.py   (idempotent: skips marks that are already there)"""
import json, os, re

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'src', 'data', 'zulfi.json')
SOURCE = 'E124'
GAP = 85  # between two stacked marks, 1/1000 em
data = json.load(open(DATA))
src = data['symbols'][SOURCE]
bar = re.findall(r'M[^M]*', src['d'])[0]
nums = [int(x) for x in re.findall(r'-?\d+', bar)]
x0, x1, y0, y1 = min(nums[0::2]), max(nums[0::2]), min(nums[1::2]), max(nums[1::2])
height, width = y1 - y0, x1 - x0


def moved(path, dx, dy):
    """the contour with every coordinate pair shifted (the path uses absolute M/Q/L/Z and H/V only through M..)"""
    out, pending = [], None
    for cmd, args in re.findall(r'([MLQHVZ])([^MLQHVZ]*)', path):
        v = [int(a) for a in re.findall(r'-?\d+', args)]
        if cmd in 'MLQ':
            v = [n + (dx if i % 2 == 0 else dy) for i, n in enumerate(v)]
        elif cmd == 'H':
            v = [n + dx for n in v]
        elif cmd == 'V':
            v = [n + dy for n in v]
        out.append(cmd + ' '.join(str(n) for n in v) if cmd in 'MLQHV' else cmd)
    return ''.join(out)


items = next(g for g in data['groups'] if g['id'] == 'letters')['items']
cp = max(int(h, 16) for h in data['symbols']) + 1
for n in (1, 2, 3):
    # the lowest mark rests on the baseline, the others stand above it
    d = ''.join(moved(bar, 30 - x0, -(y1) - i * (height + GAP)) for i in range(n))
    a = width + 60
    top = -(n * height + (n - 1) * GAP)
    if any(s['a'] == a and s['d'] == d for s in data['symbols'].values()):
        continue
    key = f'{cp:04X}'
    cp += 1
    data['symbols'][key] = dict(a=a, d=d, t=top, b=0, k='′' * n, f=src['f'], g='letters', m='mi')
    items.insert(len(items) - 1, key)  # ء (U+E188, the differential d of an Arabic editor) stays the last letter of the list
    print('added U+' + key, n, 'mark(s)', 'advance', a, 'ink', top, 0)
json.dump(data, open(DATA, 'w'), ensure_ascii=False, separators=(',', ':'))
