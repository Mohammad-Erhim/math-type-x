#!/usr/bin/env python3
"""Arabic faces bundled with the editor and the image services: DejaVu Sans (Bitstream Vera / public-domain-like licence)
subset to the Arabic blocks. Its advance widths are the ones of src/data/ar-widths.json (the layout's Arabic metrics).
usage: PYTHONPATH=<fonttools> python3 tools/gen/subset_arabic.py  -> server/fonts/MtxArabic-{Regular,Bold}.ttf"""
from fontTools import subset
from fontTools.ttLib import TTFont

SRC = {'Regular': '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'Bold': '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'}
UNICODES = list(range(0x0600, 0x0700)) + list(range(0x0750, 0x0780)) + list(range(0x08A0, 0x0900)) + list(range(0xFB50, 0xFE00)) + \
    list(range(0xFE70, 0xFF00)) + [0x0020, 0x00A0, 0x200C, 0x200D, 0x200E, 0x200F, 0x2026]
for style, path in SRC.items():
    opt = subset.Options()
    opt.layout_features = ['*']
    opt.name_IDs = ['*']
    opt.notdef_outline = True
    opt.hinting = False
    f = TTFont(path)
    s = subset.Subsetter(opt)
    s.populate(unicodes=UNICODES)
    s.subset(f)
    for rec in f['name'].names:
        if rec.nameID in (1, 16):
            rec.string = 'MTX Arabic'
        elif rec.nameID in (4, 6):
            rec.string = f'MTX Arabic {style}' if rec.nameID == 4 else f'MTXArabic-{style}'
    out = f'server/fonts/MtxArabic-{style}.ttf'
    f.save(out)
    print(out, len(f.getGlyphOrder()), 'glyphs')
