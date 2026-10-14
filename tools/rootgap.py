#!/usr/bin/env python3
"""smallest gap (css px) between the index of a root and its sign in the server render, for many indices/radicands, LTR and RTL.
usage: rootgap.py [port]"""
import sys, urllib.request, urllib.parse
from PIL import Image
port = sys.argv[1] if len(sys.argv) > 1 else '8099'
NS = 'xmlns="http://www.w3.org/1998/Math/MathML"'
Z = 4
def comps(g, thr=170):
    px = g.load(); W, H = g.size; seen = set(); out = []
    for x0 in range(W):
        for y0 in range(H):
            if px[x0, y0] < thr and (x0, y0) not in seen:
                st = [(x0, y0)]; seen.add((x0, y0)); pts = []
                while st:
                    x, y = st.pop(); pts.append((x, y))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            a, b = x + dx, y + dy
                            if 0 <= a < W and 0 <= b < H and (a, b) not in seen and px[a, b] < thr:
                                seen.add((a, b)); st.append((a, b))
                out.append(pts)
    return out
def gap(mml):
    q = urllib.parse.urlencode({'mml': mml, 'zoom': Z, 'format': 'png'})
    open('/tmp/rg.png', 'wb').write(urllib.request.urlopen(f'http://localhost:{port}/editor-services/render?' + q).read())
    im = Image.open('/tmp/rg.png').convert('RGBA'); bg = Image.new('RGBA', im.size, 'white'); bg.alpha_composite(im)
    cs = comps(bg.convert('L'))
    if len(cs) < 2: return None
    sign = max(cs, key=lambda c: max(p[0] for p in c) - min(p[0] for p in c))  # the sign + bar: the widest component
    best = 99
    for c in cs:
        if c is sign: continue
        # only the components left of / above the bar start count as index: those whose centre is above the baseline
        # (the radicand lies inside the bar): use the ones at the far side of the sign's tick: x outside the bar's span
        xs = [p[0] for p in c]
        bx0 = min(p[0] for p in sign if p[1] == min(q[1] for q in sign))
        bx1 = max(p[0] for p in sign if p[1] == min(q[1] for q in sign))
        if min(xs) >= bx0 - 1 and max(xs) <= bx1 + 1: continue  # inside the bar: the radicand
        sp = set(sign)
        d = 99
        for (x, y) in c:
            for r in range(0, 9):
                if any((x + dx, y + dy) in sp for dx in range(-r, r + 1) for dy in range(-r, r + 1) if max(abs(dx), abs(dy)) == r):
                    d = min(d, r); break
        best = min(best, d)
    return best / Z
if __name__ == '__main__':
    idxs = ['٣', '٤٦', '٢٣٤', '١٢', '٥', '٠', '٧٨', '3', '46', '12', '123', 'n', 'xy', '<mfrac><mn>1</mn><mn>2</mn></mfrac>']
    rads = {'x': '<mi>x</mi>', 'س٢': '<mn>٢</mn><mi>س</mi>', 'x2': '<msup><mi>x</mi><mn>2</mn></msup>', 'frac': '<mfrac><mi>a</mi><mi>b</mi></mfrac>'}
    worst = []
    for dir_ in ('', 'dir="rtl" '):
        for ix in idxs:
            ixm = ix if ix.startswith('<') else (f'<mn>{ix}</mn>' if ix.replace('٠', '0').replace('٣', '3').isdigit() or any(ch in '٠١٢٣٤٥٦٧٨٩' for ch in ix) or ix.isdigit() else f'<mi>{ix}</mi>')
            row = []
            for rn, rm in rads.items():
                g = gap(f'<math {dir_}{NS}><mroot><mrow>{rm}</mrow>{ixm}</mroot></math>')
                row.append(f'{rn}:{g}')
                if g is not None and g < 1.5: worst.append((g, dir_ or 'ltr', ix, rn))
            print('rtl' if dir_ else 'ltr', ix[:12].ljust(12), ' '.join(row))
    print('GAPS < 1.5 px:', len(worst)); [print(' ', w) for w in sorted(worst)[:20]]
