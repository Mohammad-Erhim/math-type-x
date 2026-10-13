"""Vector re-drawing of the toolbar control icons (all 700 controls) from the reference sprites."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from tracelib import *  # noqa: F401,F403

sm = json.load(open('evidence/sprite_map.json'))
cat = json.load(open('src/data/catalogue.json'))['controls']
by = {}
for c in cat:
    by.setdefault((c['tab'], c['group']), []).append(c)
for k in by:
    by[k].sort(key=lambda c: c['n'])
SPR = {'icons.png': SHEET, 'font_color.png': FONT, 'unicode.png': UNI}
out = {}
n = 0
for t in range(9):
    e = sm[str(t)]
    lists = [(0, e['panel'])] + [(g + 1, items) for g, items in enumerate(e['groups'])]
    for g, items in lists:
        for it, c in zip(items, by[(t, g)]):
            x = -int(it['ml'].replace('px', ''))
            y = -int(it['mt'].replace('px', ''))
            size = it['w'] - 4
            img = SPR[it['sprite']]
            cell = img[y:y + size, x:x + size].copy()
            a = cell[..., 3]
            if a.max() < 0.05:
                continue
            opaque = a > 0.5
            if opaque.sum() < 1:
                continue
            px = cell[..., :3][opaque]
            labels, centers = kmeans_colors(px, 3)
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
                up = cv2.resize(soft, (size * S, size * S), interpolation=cv2.INTER_CUBIC)
                mask = (up > coverage_threshold(up, soft)).astype(np.uint8)
                d = path_of(mask)
                if not d:
                    continue
                col = centers[ci]
                hexcol = '#%02x%02x%02x' % tuple(int(round(v * 255)) for v in col)
                layers.append({'fill': hexcol, 'area': int(mask.sum()), 'd': d})
            ink = float(a.sum()) * S * S
            if layers and sum(l['area'] for l in layers) < 0.7 * ink:
                layers = pixel_layers(cell)
            else:
                layers.sort(key=lambda l: -l['area'])
                for l in layers:
                    del l['area']
            out[c['id']] = {'w': size, 'layers': layers}
            n += 1
json.dump(out, open('src/data/control-icons.json', 'w'), separators=(',', ':'))
print('traced', n)
