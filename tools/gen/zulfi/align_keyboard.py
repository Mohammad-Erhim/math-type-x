#!/usr/bin/env python3
"""Sets every Arabic math letter of src/data/zulfi.json at the height of the normal Arabic letters of its key: halfway between
"lowest ink level with the lowest ink of the keyboard letter(s) (`k`)" and "middles level", the keyboard letters drawn in the
editor's Arabic font on the same baseline (the math letters are larger than the text letters: aligning the middles let them
hang below the text, aligning the lowest ink made them stand high). The marks (derivatives) are not letters of a keyboard and keep their place.
Idempotent: the shift is computed from the current position.
usage: python3 tools/gen/zulfi/align_keyboard.py [--dry]   (needs Pillow with raqm)"""
import json, os, re, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
DATA = os.path.join(ROOT, 'src', 'data', 'zulfi.json')
FONT = ImageFont.truetype(os.path.join(ROOT, 'server', 'fonts', 'MtxNotoNaskh-Regular.ttf'), 1000, layout_engine=ImageFont.Layout.RAQM)
MARKS = {'E19A', 'E19B', 'E19C'}
# the math letters are the dotless skeletons of the letters: the keyboard letter is measured without its dots
DOTLESS = str.maketrans({'ب': 'ٮ', 'ت': 'ٮ', 'ث': 'ٮ', 'ج': 'ح', 'خ': 'ح', 'ذ': 'د', 'ز': 'ر', 'ش': 'س', 'ض': 'ص', 'ظ': 'ط', 'غ': 'ع',
                         'ف': 'ڡ', 'ق': 'ٯ', 'ن': 'ں', 'ي': 'ى', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ة': 'ه'})
# glyphs that carry a mark above the letter (U+E124): the letter below it moves like U+E152
BODY = {'E124': 'E152'}
applied = {}


def keyboard_ink(text):
    """ink of the text in the Arabic font: (top, bottom) in 1/1000 em, y down from the baseline"""
    im = Image.new('L', (4200, 2400), 255)
    ImageDraw.Draw(im).text((300, 1500), text, font=FONT, fill=0, anchor='ls', direction='rtl', language='ar')
    ys = np.where((np.array(im) < 128).any(axis=1))[0]
    return ys.min() - 1500, ys.max() + 1 - 1500


def shift_y(path, dy):
    out = []
    for cmd, args in re.findall(r'([MLQHVZ])([^MLQHVZ]*)', path):
        v = [int(a) for a in re.findall(r'-?\d+', args)]
        if cmd in 'MLQ':
            v = [n + (dy if i % 2 else 0) for i, n in enumerate(v)]
        elif cmd == 'V':
            v = [n + dy for n in v]
        out.append(cmd + (' '.join(str(n) for n in v) if v else ''))
    return ''.join(out)


data = json.load(open(DATA))
for h in data['groups'][0]['items']:
    if h in MARKS:
        continue
    s = data['symbols'][h]
    kt, kb = keyboard_ink(s['k'].replace(' ', '').translate(DOTLESS))
    dy = applied[BODY[h]] if h in BODY else round(((kb - s['b']) + ((kt + kb) / 2 - (s['t'] + s['b']) / 2)) / 2)
    applied[h] = dy
    print(h, repr(s['k']), 'keyboard ink', (kt, kb), 'now', (s['t'], s['b']), 'shift', dy)
    if dy and '--dry' not in sys.argv:
        s['d'] = shift_y(s['d'], dy)
        s['t'] += dy
        s['b'] += dy
if '--dry' not in sys.argv:
    json.dump(data, open(DATA, 'w'), ensure_ascii=False, separators=(',', ':'))
