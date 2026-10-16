#!/usr/bin/env python3
"""Adds one symbol to src/data/zulfi.json straight from a Zulfi Math font: the text is shaped with the font and the glyphs
are converted exactly like extract.py does (SYMBOL_SCALE, raised forms brought onto the baseline).
usage: PYTHONPATH=<fonttools,uharfbuzz> python3 tools/gen/zulfi/add_symbol.py <ksor|tkamol> <text> <group> [--after HEX]
e.g.   add_symbol.py ksor ق letters --after E173   (--check re-derives an existing symbol instead and compares it)"""
import json, os, sys
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', '..', '..', 'src', 'data', 'zulfi.json')
FONTS = {'ksor': 'AlKsorZulfiMath.ttf', 'tkamol': 'AlTkamolZulfiMath.ttf'}
SYMBOL_SCALE = 1.3


def shape(font, text):
    hbf = hb.Font(hb.Face(hb.Blob.from_file_path(os.path.join(HERE, FONTS[font]))))
    buf = hb.Buffer()
    buf.add_str(text)
    buf.direction, buf.script, buf.language = 'rtl', 'Arab', 'ar'
    hb.shape(hbf, buf, {})
    return [(i.codepoint, p.x_advance, p.x_offset, p.y_offset) for i, p in zip(buf.glyph_infos, buf.glyph_positions)]


def symbol_path(font, glyphs):
    tt = TTFont(os.path.join(HERE, FONTS[font]))
    k = 1000 / tt['head'].unitsPerEm * SYMBOL_SCALE
    gs = tt.getGlyphSet()

    def draw(shift_x, shift_y):
        spen, bpen = SVGPathPen(None, ntos=lambda v: str(int(round(v)))), BoundsPen(None)
        x = 0
        for gid, adv, xo, yo in glyphs:
            name = tt.getGlyphName(gid)
            t = (k, 0, 0, -k, (x + xo) * k + shift_x, -yo * k + shift_y)
            gs[name].draw(TransformPen(spen, t))
            gs[name].draw(TransformPen(bpen, t))
            x += adv
        return x * k, spen.getCommands(), bpen.bounds or (0, 0, 0, 0)

    adv, d, b = draw(0, 0)
    shift_x = shift_y = 0
    if b[3] < -120:
        shift_y = -b[3]
    if adv < 1 or b[0] < -10:
        shift_x = 30 - b[0]
    if shift_x or shift_y:
        adv2, d, b = draw(shift_x, shift_y)
        if adv < 1 or shift_x:
            adv = max(b[2] - b[0], 1) + 60
    return round(adv), d, round(b[1]), round(b[3])


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    font, text, group = args[0], args[1], args[2]
    adv, d, y0, y1 = symbol_path(font, shape(font, text))
    data = json.load(open(DATA))
    if '--check' in sys.argv:
        for h, s in data['symbols'].items():
            if s['k'] == text and s.get('f') == font:
                print(h, 'same' if (s['a'], s['d']) == (adv, d) else 'DIFFERENT', s['a'], adv)
        return
    for h, s in data['symbols'].items():
        if (s['a'], s['d']) == (adv, d):
            sys.exit(f'already there: U+{h}')
    cp = max(int(h, 16) for h in data['symbols']) + 1
    key = f'{cp:04X}'
    data['symbols'][key] = dict(a=adv, d=d, t=y0, b=y1, k=text, f=font, g=group, m='mi')
    items = next(g for g in data['groups'] if g['id'] == group)['items']
    after = sys.argv[sys.argv.index('--after') + 1].upper() if '--after' in sys.argv else None
    items.insert(items.index(after) + 1 if after in items else len(items), key)
    json.dump(data, open(DATA, 'w'), ensure_ascii=False, separators=(',', ':'))
    print('added U+' + key, text, 'advance', adv, 'ink', y0, y1)


main()
