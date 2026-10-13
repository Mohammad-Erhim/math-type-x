#!/usr/bin/env python3
"""Compare the PNG export of our server with the reference render service for the MathML of a visual crawl.
usage: png_vs_ref.py <crawl-json>... [--out DIR] [--ours URL] [--cache DIR] [--zoom 1]
The crawl JSON comes from tools/vis_crawl.js ({results:[{id,kind,title,mml}]}).  For every distinct MathML both images
are fetched, compared (size, 1 px tolerant ink overlap) and a magnified side by side (reference | ours | difference)
is written for every image that is not (nearly) identical.
"""
import sys, os, json, hashlib, urllib.request, urllib.parse, io, time
from PIL import Image, ImageChops

REF = 'https://www.wiris.net/demo/editor/render'


def fetch(url, mml, zoom):
    q = urllib.parse.urlencode({'mml': mml, 'zoom': zoom} if zoom != 1 else {'mml': mml})
    for i in range(3):
        try:
            with urllib.request.urlopen(url + '?' + q, timeout=40) as r:
                return r.read()
        except Exception as e:  # noqa
            time.sleep(1.5)
    return None


def flat(im):
    im = im.convert('RGBA')
    bg = Image.new('RGBA', im.size, 'white')
    bg.alpha_composite(im)
    return bg.convert('L')


def ink_overlap(a, b, thr=170):
    """1 px tolerant overlap of the dark pixels of two same-size 'L' images -> (recall of a in b, recall of b in a)"""
    w, h = a.size
    pa, pb = a.load(), b.load()

    def dark(p, x, y):
        return 0 <= x < w and 0 <= y < h and p[x, y] < thr

    def near(p, x, y):
        return any(dark(p, x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1))
    na = nb = ha = hb = 0
    for y in range(h):
        for x in range(w):
            if pa[x, y] < thr:
                na += 1
                ha += near(pb, x, y)
            if pb[x, y] < thr:
                nb += 1
                hb += near(pa, x, y)
    return (ha / na if na else 1.0, hb / nb if nb else 1.0, na, nb)


def main():
    args = sys.argv[1:]
    out = 'png_vs_ref_out'
    ours_url = 'http://localhost:8099/editor-services/render'
    cache = os.path.join(os.environ.get('TMPDIR', '/tmp'), 'ref_png_cache')
    zoom = 1
    files = []
    i = 0
    while i < len(args):
        if args[i] == '--out': out = args[i + 1]; i += 2
        elif args[i] == '--ours': ours_url = args[i + 1]; i += 2
        elif args[i] == '--cache': cache = args[i + 1]; i += 2
        elif args[i] == '--zoom': zoom = int(args[i + 1]); i += 2
        else: files.append(args[i]); i += 1
    os.makedirs(out, exist_ok=True)
    os.makedirs(cache, exist_ok=True)
    seen = {}
    rows = []
    for f in files:
        d = json.load(open(f))
        for r in d['results']:
            if 'mml' not in r:
                continue
            m = r['mml']
            if not m.startswith('<math'):
                continue
            m = m.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"', 1) if 'xmlns' not in m else m
            key = hashlib.sha1((m + str(zoom)).encode()).hexdigest()[:16]
            if key in seen:
                seen[key]['ids'].append(r['id'] + '_' + r['kind'])
                continue
            seen[key] = {'ids': [r['id'] + '_' + r['kind']], 'title': r['title'], 'mml': m}
    n = 0
    for key, rec in seen.items():
        n += 1
        cpath = os.path.join(cache, key + '.png')
        if os.path.exists(cpath):
            ref = open(cpath, 'rb').read()
        else:
            ref = fetch(REF, rec['mml'], zoom)
            if ref:
                open(cpath, 'wb').write(ref)
            time.sleep(0.15)
        ours = fetch(ours_url, rec['mml'], zoom)
        if not ref or not ours:
            rows.append({**rec, 'error': 'fetch failed'})
            continue
        ra, oa = Image.open(io.BytesIO(ref)), Image.open(io.BytesIO(ours))
        row = {**rec, 'ref': list(ra.size), 'ours': list(oa.size)}
        W, H = max(ra.width, oa.width), max(ra.height, oa.height)
        A = Image.new('L', (W, H), 255); A.paste(flat(ra), (0, 0))
        B = Image.new('L', (W, H), 255); B.paste(flat(oa), (0, 0))
        diff = ImageChops.difference(A, B)
        mad = sum(diff.getdata()) / (W * H)
        rc, pr, na, nb = ink_overlap(A, B)
        row.update({'mad': round(mad, 2), 'refInRatio': round(rc, 3), 'oursInRatio': round(pr, 3), 'inkRef': na, 'inkOurs': nb,
                    'sizeEq': ra.size == oa.size})
        score = min(rc, pr)
        row['score'] = round(score, 3)
        if not (ra.size == oa.size and mad < 0.35 and score > 0.985):
            Z = 8 if W * H < 3000 else 4 if W * H < 12000 else 2
            canvas = Image.new('RGB', (W * Z * 3 + 40, H * Z + 12), 'white')
            for k, im in enumerate((A, B, diff.point(lambda v: 255 - min(255, v * 3)))):
                canvas.paste(im.convert('RGB').resize((W * Z, H * Z), Image.NEAREST), (10 + k * (W * Z + 10), 6))
            name = f"{rec['ids'][0]}.png"
            canvas.save(os.path.join(out, name))
            row['img'] = name
        rows.append(row)
        if n % 50 == 0:
            print(n, '/', len(seen), flush=True)
    rows.sort(key=lambda r: (r.get('score', 0), -r.get('mad', 0)))
    json.dump(rows, open(os.path.join(out, 'report.json'), 'w'), indent=1)
    bad = [r for r in rows if 'img' in r or 'error' in r]
    print(f'{len(rows)} distinct formulas, {len(bad)} differ from the reference ({sum(1 for r in rows if r.get("sizeEq") is False)} with another size)')
    for r in bad[:25]:
        print(r.get('score'), r.get('mad'), r.get('ref'), r.get('ours'), r['ids'][0], r['title'])


main()
