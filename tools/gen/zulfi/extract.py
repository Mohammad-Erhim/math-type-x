#!/usr/bin/env python3
"""Reads symbol-maps.pdf (the keyboard tables of the Al-Ksor / Al-Tkamol Zulfi Math fonts) and extracts every symbol of it
as an SVG path: cell -> typed text -> shaped glyphs of the font that draws the cell (found by comparing with the page).
usage: PYTHONPATH=<pymupdf,fonttools,uharfbuzz,pillow> python3 tools/gen/zulfi/extract.py OUT_DIR
writes OUT_DIR/cells.json (cells with their key labels, typed text, font, glyph ids, match score) and sheets for review."""
import json, os, sys, re
import pymupdf
import uharfbuzz as hb
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
os.makedirs(OUT, exist_ok=True)
FONTS = {'ksor': os.path.join(HERE, 'AlKsorZulfiMath.ttf'), 'tkamol': os.path.join(HERE, 'AlTkamolZulfiMath.ttf')}
HBFONT = {k: hb.Font(hb.Face(hb.Blob.from_file_path(p))) for k, p in FONTS.items()}
TT = {k: TTFont(p) for k, p in FONTS.items()}
DPI = 300
# the owner asked for larger letters: 1.3 times the size they have in the fonts
SYMBOL_SCALE = 1.3


def shape(font, text):
    buf = hb.Buffer()
    buf.add_str(text)
    buf.direction = 'rtl'
    buf.script = 'Arab'
    buf.language = 'ar'
    hb.shape(HBFONT[font], buf, {})
    return [(i.codepoint, p.x_advance, p.x_offset, p.y_offset) for i, p in zip(buf.glyph_infos, buf.glyph_positions)]


def render_text(font, text, px=96):
    f = ImageFont.truetype(FONTS[font], px, layout_engine=ImageFont.Layout.RAQM)
    im = Image.new('L', (px * (len(text) + 3), px * 3), 255)
    d = ImageDraw.Draw(im)
    d.text((px // 2, px // 2), text, font=f, fill=0, direction='rtl', language='ar', features=None)
    return im


def norm(im, n=48):
    a = np.array(im.convert('L')) < 140
    # the frames of boxed cells: lines that run across (almost) the whole crop are not part of the symbol
    if a.size:
        cols = a.mean(axis=0) > 0.8
        rows = a.mean(axis=1) > 0.9
        a[:, cols] = False
        a[rows, :] = False
    ys, xs = np.where(a)
    if len(xs) == 0:
        return None
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = a.shape
    s = (n - 4) / max(h, w)
    img = Image.fromarray((a * 255).astype('uint8')).resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    out = np.zeros((n, n), dtype=bool)
    b = np.array(img) > 100
    oy, ox = (n - b.shape[0]) // 2, (n - b.shape[1]) // 2
    out[oy:oy + b.shape[0], ox:ox + b.shape[1]] = b
    return out


def score(a, b):
    if a is None or b is None:
        return 0.0
    # tolerant overlap: dilate by one cell
    def dil(x):
        y = x.copy()
        y[1:] |= x[:-1]; y[:-1] |= x[1:]; y[:, 1:] |= x[:, :-1]; y[:, :-1] |= x[:, 1:]
        return y
    inter = (a & dil(b)).sum() + (b & dil(a)).sum()
    return inter / max(1, a.sum() + b.sum())


from fontTools.pens.recordingPen import RecordingPen


def glyph_bitmap(font, gname, px=96):
    gs = TT[font].getGlyphSet()
    pen = RecordingPen()
    gs[gname].draw(pen)
    upm = TT[font]['head'].unitsPerEm
    k = px / upm
    contours, cur = [], []

    def q(p0, p1, p2, n=8):
        return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in [i / n for i in range(1, n + 1)]]
    for op, args in pen.value:
        if op == 'moveTo':
            cur = [args[0]]
        elif op == 'lineTo':
            cur.append(args[0])
        elif op == 'qCurveTo':
            pts = list(args)
            start = cur[-1]
            if pts[-1] is None:
                pts = pts[:-1]
            # implied on-curve points between consecutive off-curve ones
            offs = pts[:-1]
            end = pts[-1]
            seq = []
            for i, o in enumerate(offs):
                nxt = offs[i + 1] if i + 1 < len(offs) else end
                on = ((o[0] + nxt[0]) / 2, (o[1] + nxt[1]) / 2) if i + 1 < len(offs) else end
                seq.append((o, on))
            for o, on in seq:
                cur += q(start, o, on)
                start = on
        elif op == 'curveTo':
            p0 = cur[-1]; c1, c2, p3 = args
            for t in [i / 8 for i in range(1, 9)]:
                x = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * c1[0] + 3 * (1 - t) * t * t * c2[0] + t ** 3 * p3[0]
                y = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * c1[1] + 3 * (1 - t) * t * t * c2[1] + t ** 3 * p3[1]
                cur.append((x, y))
        elif op in ('closePath', 'endPath'):
            if len(cur) > 2:
                contours.append(cur)
            cur = []
    if not contours:
        return None
    W, H = px * 3, px * 3
    mask = np.zeros((H, W), dtype=bool)
    for c in contours:
        im = Image.new('1', (W, H), 0)
        ImageDraw.Draw(im).polygon([(px + x * k, px * 2 - y * k) for x, y in c], fill=1)
        mask ^= np.array(im)
    return Image.fromarray((~mask * 255).astype('uint8'))


_all = {}
def all_glyph_norms():
    if _all:
        return _all
    for font in FONTS:
        for gid, gname in enumerate(TT[font].getGlyphOrder()):
            try:
                bm = glyph_bitmap(font, gname)
            except Exception:
                bm = None
            if bm is not None:
                n = norm(bm)
                if n is not None:
                    _all[(font, gid)] = n
    return _all


doc = pymupdf.open(os.path.join(HERE, 'symbol-maps.pdf'))
cells = []
for pi, page in enumerate(doc):
    spans = []
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                if s['text'].strip():
                    spans.append((s['bbox'], s['text']))
    rects = [(x['rect'].x0, x['rect'].y0, x['rect'].y1) for x in page.get_drawings() if x['rect'].width < 2.5 and 15 < x['rect'].height < 45]
    heads = sorted([(b, t.strip()) for b, t in spans if t.strip() in ('المكان', 'الرمز')], key=lambda h: h[0][1])
    # table name above each block of rows (the captions are bold lines starting with "جدول" / "الجدول" / "الرموز")
    captions = [(b[1], t) for b, t in spans if re.match(r'^\(?\s*(ال)?جدول|^: ?الرموز', t.strip())]
    pix = page.get_pixmap(dpi=DPI)
    full = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    sc = DPI / 72
    i = 0
    while i < len(heads) - 1:
        (kb, kt), (sb, st) = heads[i], heads[i + 1]
        if kt != 'المكان' or st != 'الرمز':
            i += 1
            continue
        yk, ys = kb[1], sb[1]
        edges = sorted({round(x, 1) for x, y0, y1 in rects if y0 - 3 <= yk + 10 <= y1 + 3})
        cols = list(zip(edges[:-1], edges[1:]))
        cols = [c for c in cols if c[1] <= kb[0] + 8]  # not the header column
        cap = [t for y, t in captions if y < yk]
        cap = cap[-1] if cap else ''
        for ci, (x0, x1) in enumerate(cols):
            def inside(rowy):
                r = [(b, t) for b, t in spans if abs(b[1] - rowy) < 6 and x0 - 1 <= (b[0] + b[2]) / 2 <= x1 + 1 and t.strip() not in ('المكان', 'الرمز')]
                r.sort(key=lambda it: -(it[0][0] + it[0][2]))
                return [t for b, t in r]
            key_parts = inside(yk)
            typed_parts = inside(ys)
            shift = any(p.strip() == '"' for p in key_parts)
            key = ''.join(p.strip() for p in key_parts if p.strip() != '"')
            typed = ''.join(p.strip() for p in typed_parts)
            crop = full.crop((int((x0 + 1.5) * sc), int((ys + 1) * sc), int((x1 - 1.5) * sc), int((ys + 23) * sc)))
            cells.append(dict(page=pi + 1, row=yk, col=ci, x0=x0, x1=x1, key=key, shift=shift, typed=typed, caption=cap, _crop=crop))
        i += 2
# the table of new symbols below table 4 has no المكان / الرمز headers: keys row 377-407, symbols row 408-436
page = doc[1]
spans2 = []
for b in page.get_text('dict')['blocks']:
    for l in b.get('lines', []):
        for sp in l['spans']:
            if sp['text'].strip() and sp['bbox'][1] > 360:
                spans2.append((sp['bbox'], sp['text']))
rects2 = sorted({round(x['rect'].x0, 1) for x in page.get_drawings() if x['rect'].width < 2.5 and 15 < x['rect'].height < 45 and x['rect'].y0 > 370})
pix = page.get_pixmap(dpi=DPI)
full2 = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
words = []  # (x centre, word) of the key row: a span holding several keys is split evenly
for b, t in spans2:
    if b[1] < 405 and b[1] > 370:
        ws = t.split()
        if not ws:
            continue
        w = (b[2] - b[0]) / len(ws)
        for k, word in enumerate(ws):
            words.append((b[2] - w * (k + 0.5), word))  # right to left reading order
for ci, (x0, x1) in enumerate(zip(rects2[:-1], rects2[1:])):
    key = ' '.join(w for xc, w in words if x0 <= xc <= x1)
    typed = ''.join(t.strip() for b, t in sorted(spans2, key=lambda it: -it[0][0]) if b[1] > 405 and x0 - 1 <= (b[0] + b[2]) / 2 <= x1 + 1)
    crop = full2.crop((int((x0 + 1.5) * sc_), int(409 * sc_), int((x1 - 1.5) * sc_), int(431 * sc_))) if (sc_ := DPI / 72) else None
    cells.append(dict(page=2, row=377, col=ci, x0=x0, x1=x1, key=key, shift=False, typed=typed, caption='الرموز الجديدة', _crop=crop))
print(len(cells), 'cells')
review = []
for n, c in enumerate(cells):
    ref = norm(c['_crop'])
    best = None
    cands = []
    for t in dict.fromkeys([c['typed'], c['key'], c['typed'].replace(' ', ''), c['key'].replace(' ', '')]):
        if t:
            cands.append(t)
    for font in FONTS:
        for t in cands:
            try:
                sc_ = score(ref, norm(render_text(font, t)))
            except Exception as e:  # unrenderable
                sc_ = 0
            if best is None or sc_ > best[0]:
                best = (sc_, font, t)
    # nothing typed explains the cell: look at every glyph of both fonts
    c['single'] = None
    if ref is not None and (not best or best[0] < 0.85):
        cand = (0, None)
        for key, n in all_glyph_norms().items():
            v = score(ref, n)
            if v > cand[0]:
                cand = (v, key)
        if cand[1] is not None and (not best or cand[0] > best[0] + 0.05):
            best = (cand[0], cand[1][0], '')
            c['single'] = cand[1][1]
    c['score'] = round(best[0], 3) if best else 0
    c['font'] = best[1] if best else None
    c['text'] = best[2] if best else ''
    c['empty'] = ref is None
    if c['single'] is not None:
        c['glyphs'] = [(c['single'], TT[best[1]]['hmtx'][TT[best[1]].getGlyphName(c['single'])][0], 0, 0)]
    elif best and not c['empty']:
        c['glyphs'] = shape(best[1], best[2])
    else:
        c['glyphs'] = []
    review.append(c)
os.makedirs(os.path.join(OUT, 'crops'), exist_ok=True)
for c in cells:
    c['id'] = f"{c['page']}_{int(c['row'])}_{c['col']}"
    c['_crop'].save(os.path.join(OUT, 'crops', c['id'] + '.png'))
json.dump([{k: v for k, v in c.items() if not k.startswith('_')} for c in cells], open(os.path.join(OUT, 'cells.json'), 'w'), ensure_ascii=False, indent=1)
# contact sheet: PDF crop | rendering of the chosen text in the chosen font
S = 3
W = 560
rows_per = 40
for part in range(0, len(cells), rows_per):
    chunk = cells[part:part + rows_per]
    sheet = Image.new('RGB', (W * 2, 70 * len(chunk)), 'white')
    d = ImageDraw.Draw(sheet)
    for r, c in enumerate(chunk):
        y = r * 70
        crop = c['_crop']
        if crop.height > 60: crop = crop.resize((int(crop.width * 60 / crop.height), 60))
        sheet.paste(crop, (4, y + 4))
        if c['text'] or c.get('single') is not None:
            im = (render_text(c['font'], c['text'], 40) if c['text'] else glyph_bitmap(c['font'], TT[c['font']].getGlyphName(c['single']), 40)).convert('RGB')
            a = np.array(im.convert('L')) < 200
            ys_, xs_ = np.where(a)
            if len(xs_):
                im = im.crop((xs_.min() - 2, ys_.min() - 2, xs_.max() + 3, ys_.max() + 3))
                if im.height > 60: im = im.resize((int(im.width * 60 / im.height), 60))
                sheet.paste(im, (W + 4, y + 4))
        d.text((W // 2 + 40, y + 4), f"p{c['page']} r{int(c['row'])} c{c['col']} sc={c['score']} {c['font']}", fill=(200, 0, 0))
        d.text((W // 2 + 40, y + 22), f"typed={c['typed']!r} key={c['key']!r}", fill=(0, 0, 150))
        d.line([(0, y + 69), (W * 2, y + 69)], fill=(220, 220, 220))
    sheet.save(os.path.join(OUT, f'sheet_{part // rows_per}.png'))
low = [c for c in cells if c['score'] < 0.55 and not c['empty']]
print('empty cells', sum(c['empty'] for c in cells), 'low scores', len(low))

# ---------------------------------------------------------------- symbols as paths (src/data/zulfi.json)
if len(sys.argv) > 2:
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.pens.boundsPen import BoundsPen
    GROUPS = [
        ('algebra', 'Algebra', 'جبر وعمليات'),
        ('letters', 'Letters, functions', 'حروف ودوال'),
        ('geometry', 'Geometry', 'هندسة'),
        ('calculus', 'Calculus', 'تفاضل وتكامل'),
        ('new', 'New symbols', 'الرموز الجديدة'),
    ]
    CAP2GROUP = {'الجدول1': 'algebra', 'الجدول2': 'letters', 'جدول3': 'geometry', 'جدول4': 'calculus', 'الرموز اجلديدة': 'new', 'الرموز الجديدة': 'new'}

    def group_of(caption):
        c = caption.replace(' ', '').replace('(', '').replace(')', '')
        for k, v in CAP2GROUP.items():
            if c.startswith(k.replace(' ', '')) or k.replace(' ', '') in c:
                return v
        return 'new'

    def symbol_path(font, glyphs):
        """glyph run -> (advance, path d, ymin, ymax) in 1/1000 em, y down from the baseline"""
        tt = TT[font]
        upm = tt['head'].unitsPerEm
        # the shapes are drawn small for their em: set 1.3 times larger (SYMBOL_SCALE), they read as letters of the size
        # of the text around them
        k = 1000 / upm * SYMBOL_SCALE
        gs = tt.getGlyphSet()

        def draw(shift_x, shift_y):
            spen = SVGPathPen(None, ntos=lambda v: str(int(round(v))))
            bpen = BoundsPen(None)
            x = 0
            # shaped for right-to-left: the buffer is in visual order, left to right
            for gid, adv, xo, yo in glyphs:
                name = tt.getGlyphName(gid)
                t = (k, 0, 0, -k, (x + xo) * k + shift_x, -yo * k + shift_y)
                gs[name].draw(TransformPen(spen, t))
                gs[name].draw(TransformPen(bpen, t))
                x += adv
            return x * k, spen.getCommands(), bpen.bounds or (0, 0, 0, 0)

        adv, d, b = draw(0, 0)
        shift_x = shift_y = 0
        # the raised forms of the tables (letters that sit as exponents inside the printed fractions) are brought down
        # onto the baseline: as symbols of a formula they stand where the letters of the text stand
        if b[3] < -120:
            shift_y = -b[3]
        # marks (zero advance, ink to the left of the origin) become spaced shapes of their own
        if adv < 1 or b[0] < -10:
            shift_x = 30 - b[0]
        if shift_x or shift_y:
            adv2, d, b = draw(shift_x, shift_y)
            if adv < 1 or shift_x:
                adv = max(b[2] - b[0], 1) + 60
        return round(adv), d, round(b[1]), round(b[3])

    symbols = {}
    seen = {}
    groups = {g: [] for g, _, _ in GROUPS}
    next_cp = 0xE100
    for c in cells:
        if c['empty'] or not c['glyphs'] or c['score'] < 0.4:
            continue
        adv, d, y0, y1 = symbol_path(c['font'], c['glyphs'])
        if not d:
            continue
        sig = (adv, d)
        g = group_of(c['caption'])
        if sig not in seen:
            seen[sig] = next_cp
            symbols[next_cp] = dict(a=adv, d=d, t=y0, b=y1, k=c['key'] or c['typed'], f=c['font'], g=g, m='mo' if g == 'algebra' else 'mi')
            next_cp += 1
        # the same symbol may be listed by several tables: it belongs to each of those lists
        if seen[sig] not in groups[g]:
            groups[g].append(seen[sig])
    # palettes by meaning (tools/gen/zulfi/categories.json); a symbol is listed once, under its meaning
    cat = json.load(open(os.path.join(HERE, 'categories.json')))
    drop = {0xE100 + int(h, 16) for h in cat['drop']}
    placed, glist = set(), []
    for g in cat['groups']:
        items = [0xE100 + int(h, 16) for h in g['items'] if 0xE100 + int(h, 16) in symbols and 0xE100 + int(h, 16) not in drop]
        placed.update(items)
        for c in items:
            symbols[c]['m'] = 'mo' if g['id'] in ('operators', 'relations', 'sets', 'arrows', 'brackets', 'marks') else 'mi'
        glist.append(dict(id=g['id'], en=g['en'], ar=g['ar'], items=[f'{c:04X}' for c in items]))
    rest = [c for c in sorted(symbols) if c not in placed and c not in drop]
    for c in rest:
        if not cat.get('other'):
            symbols.pop(c)  # symbols of no palette are not shipped
    if rest and cat.get('other'):
        o = cat['other']
        glist.append(dict(id=o['id'], en=o['en'], ar=o['ar'], items=[f'{c:04X}' for c in rest]))
    for c in drop:
        symbols.pop(c, None)
    out = dict(
        upm=1000,
        groups=glist,
        symbols={f'{c:04X}': v for c, v in symbols.items()},
    )
    json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, separators=(',', ':'))
    print('symbols', len(symbols), {g['id']: len(g['items']) for g in glist})
