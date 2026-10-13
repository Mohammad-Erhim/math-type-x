"""Traces the 8x renderings of the handwriting-mode SVG assets into compact SVG paths (src/data/hand-icons.json)."""
import json, glob, os
import numpy as np, cv2
from PIL import Image
S = 8
out = {}
for f in sorted(glob.glob('evidence/sprites/hand/*_8x.png')):
    name = os.path.basename(f).replace('_8x.png', '')
    im = np.array(Image.open(f).convert('RGBA'))
    a = im[..., 3].astype(np.float32) / 255
    h, w = a.shape
    mask = (a > 0.5).astype(np.uint8)
    cs, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    d = []
    for c in cs:
        if len(c) < 6:
            continue
        pts = c[:, 0, :].astype(np.float32)
        ap = cv2.approxPolyDP(pts.reshape(-1, 1, 2), 1.0, True)[:, 0, :]
        if len(ap) < 3:
            continue
        d.append('M' + ' '.join(f'{(x + .5) / S:.2f} {(y + .5) / S:.2f}' for x, y in ap) + 'Z')
    # dominant colour
    ys, xs = np.nonzero(mask)
    col = im[ys, xs, :3].mean(axis=0) if len(ys) else (0, 0, 0)
    out[name] = {'w': round(w / S, 2), 'h': round(h / S, 2), 'fill': '#%02x%02x%02x' % tuple(int(v) for v in col), 'd': ''.join(d)}
    print(name, out[name]['w'], out[name]['h'], out[name]['fill'], len(out[name]['d']))
json.dump(out, open('src/data/hand-icons.json', 'w'), separators=(',', ':'))
