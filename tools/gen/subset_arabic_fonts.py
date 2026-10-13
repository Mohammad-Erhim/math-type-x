#!/usr/bin/env python3
"""Arabic-script faces offered in the Font list (all SIL Open Font License): Amiri, Scheherazade New, Noto Naskh Arabic
and Noto Kufi Arabic, subset to the Arabic blocks (letters, digits, punctuation, presentation forms) with their layout
features, renamed "MTX <name>" (the reserved names of the originals are not reused) and written as
  server/fonts/Mtx<Name>-{Regular,Bold}.ttf   (the image services)
  public/fonts/Mtx<Name>-{Regular,Bold}.woff2 (the browser; copied to dist/public/fonts by the build)
usage: SRC=<dir with the original .ttf files> PYTHONPATH=<fonttools+brotli> python3 tools/gen/subset_arabic_fonts.py
Originals: github.com/alif-type/amiri, github.com/silnrsi/font-scheherazade, github.com/notofonts (also in google/fonts/ofl)."""
import os
from fontTools import subset
from fontTools.ttLib import TTFont

SRC = os.environ.get('SRC', '.')
FONTS = {
    'MtxAmiri': ('MTX Amiri', {'Regular': 'Amiri-Regular.ttf', 'Bold': 'Amiri-Bold.ttf'}),
    'MtxScheherazade': ('MTX Scheherazade', {'Regular': 'ScheherazadeNew-Regular.ttf', 'Bold': 'ScheherazadeNew-Bold.ttf'}),
    'MtxNotoNaskh': ('MTX Noto Naskh', {'Regular': 'NotoNaskhArabic-Regular.ttf', 'Bold': 'NotoNaskhArabic-Bold.ttf'}),
    'MtxNotoKufi': ('MTX Noto Kufi', {'Regular': 'NotoKufiArabic-Regular.ttf', 'Bold': 'NotoKufiArabic-Bold.ttf'}),
}
UNICODES = list(range(0x0600, 0x0700)) + list(range(0x0750, 0x0780)) + list(range(0x08A0, 0x0900)) + list(range(0xFB50, 0xFE00)) + \
    list(range(0xFE70, 0xFF00)) + [0x0020, 0x00A0, 0x200C, 0x200D, 0x200E, 0x200F, 0x2026, 0x25CC]
for stem, (family, files) in FONTS.items():
    for style, name in files.items():
        f = TTFont(os.path.join(SRC, name))
        upm = f['head'].unitsPerEm
        opt = subset.Options()
        opt.layout_features = ['*']
        opt.name_IDs = [0, 1, 2, 3, 4, 6, 13, 14, 16, 17]
        opt.name_languages = [0x409]
        opt.notdef_outline = True
        opt.hinting = False
        opt.glyph_names = False
        s = subset.Subsetter(opt)
        s.populate(unicodes=UNICODES)
        s.subset(f)
        for rec in f['name'].names:
            if rec.nameID in (1, 16):
                rec.string = family
            elif rec.nameID in (2, 17):
                rec.string = style
            elif rec.nameID == 4:
                rec.string = f'{family} {style}'
            elif rec.nameID == 6:
                rec.string = f'{stem}-{style}'
            elif rec.nameID == 3:
                rec.string = f'{stem}-{style}-subset'
        ttf = f'server/fonts/{stem}-{style}.ttf'
        f.save(ttf)
        f.flavor = 'woff2'
        w2 = f'public/fonts/{stem}-{style}.woff2'
        f.save(w2)
        print(ttf, upm, len(f.getGlyphOrder()), 'glyphs', os.path.getsize(ttf) // 1024, 'KB ttf', os.path.getsize(w2) // 1024, 'KB woff2')
