"""Traces the right-to-left variants of the toolbar icons (the reference swaps mirrored sprites in RTL mode)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from tracelib import *  # noqa: F401,F403

rtl = json.load(open('evidence/ref_rtl_sprites.json'))
cat = json.load(open('src/data/catalogue.json'))['controls']
by = {}
for c in cat:
    by.setdefault((c['tab'], c['group']), []).append(c)
for k in by:
    by[k].sort(key=lambda c: c['n'])

def cell_of(spec):
    name, ml, mt = spec.split('|')
    return name, -int(ml.replace('px', '')), -int(mt.replace('px', ''))

def trace(img, x, y, w, h, kmax=3):
    cell = img[y:y + h, x:x + w].copy()
    a = cell[..., 3]
    opaque = a > 0.5
    if opaque.sum() < 1:
        return None
    labels, centers = kmeans_colors(cell[..., :3][opaque], kmax)
    idx = -np.ones(a.shape, np.int32)
    idx[opaque] = labels
    layers = []
    for ci in range(len(centers)):
        soft = np.where(idx == ci, a, 0).astype(np.float32)
        part = (a > 0.08) & ~opaque
        if part.any():
            ys, xs = np.nonzero(part)
            for yy, xx in zip(ys, xs):
                dd = np.linalg.norm(centers - cell[yy, xx, :3], axis=1)
                if int(np.argmin(dd)) == ci:
                    soft[yy, xx] = a[yy, xx]
        up = cv2.resize(soft, (w * S, h * S), interpolation=cv2.INTER_CUBIC)
        mask = (up > coverage_threshold(up, soft)).astype(np.uint8)
        d = path_of(mask)
        if not d:
            continue
        col = centers[ci]
        layers.append({'fill': '#%02x%02x%02x' % tuple(int(round(v * 255)) for v in col), 'area': int(mask.sum()), 'd': d})
    ink = float(a.sum()) * S * S
    if layers and sum(l['area'] for l in layers) < 0.7 * ink:
        return pixel_layers(cell)
    layers.sort(key=lambda l: -l['area'])
    for l in layers:
        del l['area']
    return layers

SPR = {'icons.png': SHEET, 'font_color.png': FONT, 'unicode.png': UNI}
out = {'controls': {}, 'tabs': {}}
for t in range(9):
    ltr = rtl['ltr'][str(t)]
    rr = rtl['rtl'][str(t)]
    ctrls = by[(t, 0)]
    for i, (a, b) in enumerate(zip(ltr, rr)):
        if a[1] == b[1] or not b[1]:
            continue
        name, x, y = cell_of(b[1])
        size = 29 if ctrls[i]['geom'][2] >= 33 else 18
        layers = trace(SPR[name], x, y, size, size)
        if layers:
            out['controls'][ctrls[i]['id']] = {'w': size, 'layers': layers}
# tabs: unselected cells (tab 0 uses the selected cell)
for i, (title, spec, _) in enumerate(rtl['rtl']['tabs']):
    if not spec:
        continue
    ml, mt = spec.split('|')
    x, y = -int(ml.replace('px', '')), -int(mt.replace('px', ''))
    layers = trace(SHEET, x, y, 30, 20, 1)
    if layers:
        for l in layers:
            l['fill'] = 'currentColor'
        out['tabs'][str(i)] = {'w': 30, 'h': 20, 'layers': layers}
json.dump(out, open('src/data/rtl-icons.json', 'w'), separators=(',', ':'))
print('controls', len(out['controls']), 'tabs', len(out['tabs']))
