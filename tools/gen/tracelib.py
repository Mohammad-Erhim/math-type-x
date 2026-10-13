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
CELLS.clear()
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
        n = len(c)
        pts = c[:, 0, :].astype(np.float32)
        if n < 6:
            # dots of letters, full stops, hairline ends: kept as the box they cover (they used to be dropped)
            if n < 2:
                continue
            x0, y0 = pts.min(axis=0)
            x1, y1 = pts.max(axis=0)
            q = np.array([[x0, y0], [x1 + 1, y0], [x1 + 1, y1 + 1], [x0, y1 + 1]], np.float32) / S
            d.append('M' + ' '.join(f'{x:.2f} {y:.2f}' for x, y in q) + 'Z')
            continue
        # small shapes (dots, serifs) are smoothed less so that they keep their size
        pts = smooth(pts, 9 if n >= 40 else 3 if n >= 12 else 1).astype(np.float32)
        ap = cv2.approxPolyDP(pts.reshape(-1, 1, 2), 1.0 if n >= 40 else 0.5, True)[:, 0, :]
        if len(ap) < 3:
            continue
        # contour pixel centres → pixel edges: shift by +0.5 then scale
        pts = (ap + 0.5) / S
        d.append('M' + ' '.join(f'{x:.2f} {y:.2f}' for x, y in pts) + 'Z')
    return ''.join(d)




def split_dots(cell, max_px=4):
    """Isolated specks of at most `max_px` pixels (the dots of Arabic letters, full stops) cannot be vectorised by a
    threshold at 8x: they are cut out of the cell and returned as exact pixel squares with their opacity."""
    a = cell[..., 3]
    m = (a > 0.06).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    layers = {}
    out = cell.copy()
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > max_px:
            continue
        ys, xs = np.nonzero(lab == i)
        for y, x in zip(ys, xs):
            col = tuple(int(round(v * 255)) for v in cell[y, x, :3])
            op = round(float(a[y, x]), 2)
            layers.setdefault((col, op), []).append(f'M{x} {y}h1v1h-1z')
            out[y, x, 3] = 0
    res = [{'fill': '#%02x%02x%02x' % col, 'op': op, 'd': ''.join(d)} for (col, op), d in layers.items()]
    return out, res


def pixel_layers(cell, levels=6):
    """exact pixel representation (merged horizontal runs per opacity level) for hair-line artwork"""
    h, w = cell.shape[:2]
    a = cell[..., 3]
    layers = {}
    for y in range(h):
        x = 0
        while x < w:
            if a[y, x] < 0.06:
                x += 1
                continue
            lvl = max(1, min(levels, int(round(a[y, x] * levels))))
            col = tuple(int(round(v * 255)) for v in cell[y, x, :3])
            x2 = x + 1
            while x2 < w and a[y, x2] >= 0.06 and max(1, min(levels, int(round(a[y, x2] * levels)))) == lvl and tuple(int(round(v * 255)) for v in cell[y, x2, :3]) == col:
                x2 += 1
            layers.setdefault((col, lvl), []).append(f'M{x} {y}h{x2 - x}v1h-{x2 - x}z')
            x = x2
    out = []
    for (col, lvl), d in layers.items():
        out.append({'fill': '#%02x%02x%02x' % col, 'op': round(lvl / levels, 2), 'd': ''.join(d)})
    return out

def sparse(mask, soft):
    return float(mask.sum()) < 0.7 * float(soft.sum()) * S * S
