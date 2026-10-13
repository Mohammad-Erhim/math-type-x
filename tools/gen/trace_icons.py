"""Vectorises the reference toolbar bitmaps (1x sprites) into smooth SVG paths.
   python3 tools/gen/trace_icons.py  → src/data/traced-icons.json
   Sources are downloaded to evidence/sprites by tools (icons.png, font_color.png, unicode.png)."""
import json, sys
import numpy as np
import cv2
from PIL import Image

S = 8  # up-sampling factor

def load(name):
    return np.array(Image.open(f'evidence/sprites/{name}').convert('RGBA')).astype(np.float32) / 255.0

SHEET = load('icons.png')
FONT = load('font_color.png')
UNI = load('unicode.png')

CELLS = {}
# 29x29 large buttons are not traced (drawn by the layout engine); small ones (18x18) of the General tab
for title, (x, y) in {
    'copy': (35, 332), 'cut': (35, 354), 'paste': (35, 376), 'undo': (35, 398), 'redo': (35, 420),
    'bold': (35, 442), 'italic': (35, 464), 'autoitalic': (35, 486), 'regtext': (35, 508), 'rtl': (35, 530), 'ligature': (35, 552),
}.items():
    CELLS[title] = (SHEET, x, y, 18, 18)
CELLS['help'] = (SHEET, 1302, 216, 18, 18)
CELLS['color'] = (FONT, 0, 0, 18, 18)
CELLS['special'] = (UNI, 0, 0, 18, 18)
TABS = {0: (1268, 382), 1: (1268, 122), 2: (1336, 96), 3: (1302, 286), 4: (1302, 146), 5: (1302, 2), 6: (1268, 264), 7: (1268, 74), 8: (1302, 454), 9: (1268, 146)}
for i, (x, y) in TABS.items():
    CELLS[f'tab{i}'] = (SHEET, x, y, 30, 20)

KMAX = {'help': 2, 'special': 3, 'paste': 3, 'copy': 3, 'cut': 2, 'color': 5}

def kmeans_colors(px, kmax=5):
    best = None
    for k in range(1, kmax + 1):
        if len(px) < k:
            break
        crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
        _, labels, centers = cv2.kmeans(px.astype(np.float32), k, None, crit, 4, cv2.KMEANS_PP_CENTERS)
        d = np.linalg.norm(px - centers[labels.ravel()], axis=1)
        best = (labels.ravel(), centers)
        if np.percentile(d, 95) < 22 / 255:
            break
    return best

def coverage_threshold(up, soft):
    # choose the threshold that keeps the ink coverage of the 1x bitmap (preserves thin strokes)
    target = float(soft.sum()) * S * S
    lo, hi = 0.2, 0.7
    for _ in range(10):
        mid = (lo + hi) / 2
        if float((up > mid).sum()) > target:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2

def smooth(c, w=5):
    n = len(c)
    if n < 2 * w:
        return c
    k = np.ones(w) / w
    pad = np.concatenate([c[-w:], c, c[:w]])
    xs = np.convolve(pad[:, 0], k, mode='same')[w:-w]
    ys = np.convolve(pad[:, 1], k, mode='same')[w:-w]
    return np.stack([xs, ys], axis=1)

def path_of(mask):
    cs, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    d = []
    for c in cs:
        if len(c) < 6:
            continue
        pts = c[:, 0, :].astype(np.float32)
        pts = smooth(pts, 9).astype(np.float32)
        ap = cv2.approxPolyDP(pts.reshape(-1, 1, 2), 1.0, True)[:, 0, :]
        if len(ap) < 3:
            continue
        # contour pixel centres → pixel edges: shift by +0.5 then scale
        pts = (ap + 0.5) / S
        d.append('M' + ' '.join(f'{x:.2f} {y:.2f}'.rstrip('0').rstrip('.') if False else f'{x:.2f} {y:.2f}' for x, y in pts) + 'Z')
    return ''.join(d)

out = {}
for name, (img, x, y, w, h) in CELLS.items():
    cell = img[y:y + h, x:x + w].copy()
    a = cell[..., 3]
    if a.max() < 0.05:
        print('empty', name)
        continue
    opaque = a > 0.5
    layers = []
    if name.startswith('tab'):
        centers = np.array([[1, 1, 1]], np.float32)
        labels = np.zeros(int(opaque.sum()), np.int32)
    else:
        px = cell[..., :3][opaque]
        labels, centers = kmeans_colors(px, KMAX.get(name, 4))
    idx = -np.ones(a.shape, np.int32)
    idx[opaque] = labels
    for ci in range(len(centers)):
        soft = np.where(idx == ci, a, 0).astype(np.float32)
        # pixels that are only partially covered keep their share for thin strokes
        part = (a > 0.08) & ~opaque
        if part.any():
            # attach partial pixels to the nearest opaque cluster by colour
            ys, xs = np.nonzero(part)
            for yy, xx in zip(ys, xs):
                col = cell[yy, xx, :3]
                dd = np.linalg.norm(centers - col, axis=1)
                if int(np.argmin(dd)) == ci:
                    soft[yy, xx] = a[yy, xx]
        up = cv2.resize(soft, (w * S, h * S), interpolation=cv2.INTER_CUBIC)
        mask = (up > coverage_threshold(up, soft)).astype(np.uint8)
        d = path_of(mask)
        if not d:
            continue
        col = centers[ci]
        hexcol = '#%02x%02x%02x' % tuple(int(round(v * 255)) for v in col)
        layers.append({'fill': 'currentColor' if name.startswith('tab') else hexcol, 'area': int(mask.sum()), 'd': d})
    layers.sort(key=lambda l: -l['area'])
    for l in layers:
        del l['area']
    out[name] = {'w': w, 'h': h, 'layers': layers}
    print(name, len(layers), sum(len(l['d']) for l in layers))
json.dump(out, open('src/data/traced-icons.json', 'w'), separators=(',', ':'))
