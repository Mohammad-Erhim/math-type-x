#!/usr/bin/env python3
"""Contact sheets for tools/ctx_audit.js output: one PNG per case/stop – the state before and the state after each control,
labelled; red label = pixels unchanged (control had no visible effect), grey = MathML unchanged too.
usage: ctx_sheet.py [audit_dir] [case…]  → <audit_dir>/<case>_sheets/sNN.png and a summary table on stdout"""
import json, os, sys
from PIL import Image, ImageChops, ImageDraw, ImageFont
root = sys.argv[1] if len(sys.argv) > 1 else '.cache/audit'
want = sys.argv[2:]
W, H, COLS = int(os.environ.get('TW', 600)), int(os.environ.get('TH', 190)), 2
PER = int(os.environ.get('PER', 8))
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)
except Exception: F = ImageFont.load_default()
def crop(path):
    im = Image.open(path).convert('RGB').crop((0, 0, W, H))
    return im
def strip_mml(m): return m
for case in sorted(os.listdir(root)):
    cd = os.path.join(root, case)
    if not os.path.isdir(cd) or case.endswith('_sheets') or (want and case not in want): continue
    out = os.path.join(root, case + '_sheets'); os.makedirs(out, exist_ok=True)
    [os.remove(os.path.join(out, f)) for f in os.listdir(out)]
    for stop in sorted(os.listdir(cd)):
        ip = os.path.join(cd, stop, 'info.json')
        if not os.path.exists(ip): continue
        info = json.load(open(ip))
        base_h = Image.open(os.path.join(cd, stop, 'before_h.png')).convert('RGB')
        tiles = [(crop(os.path.join(cd, stop, 'before.png')), f"BEFORE  stop {info['stop']}  controls: " + ', '.join(c['t'] for c in info['sig'])[:90], (0, 0, 0))]
        for op in info['ops']:
            if 'file' not in op:
                tiles.append((Image.new('RGB', (W, H), 'white'), f"{op['label']}  ERR {op.get('err','')[:60]}", (200, 0, 0))); continue
            im = crop(os.path.join(cd, stop, op['file'] + '.png'))
            h = Image.open(os.path.join(cd, stop, op['file'] + '_h.png')).convert('RGB')
            diff = ImageChops.difference(base_h.crop((0, 100, 725, 415)), h.crop((0, 100, 725, 415))).getbbox()
            same_mml = op.get('mml') == info['mml']
            tag = ''
            col = (0, 100, 0)
            if diff is None: tag = ' [NO PIXEL CHANGE' + (', MML same]' if same_mml else ', MML CHANGED]'); col = (200, 0, 0) if not same_mml else (120, 120, 120)
            if op.get('dis'): tag += ' (disabled)'
            tiles.append((im, op['label'] + tag, col))
            op['_diff'] = diff is not None; op['_same_mml'] = same_mml
        for part in range(0, len(tiles), PER):
            chunk = tiles[part:part + PER]
            rows = (len(chunk) + COLS - 1) // COLS
            sheet = Image.new('RGB', (COLS * (W + 6), rows * (H + 20)), 'white')
            d = ImageDraw.Draw(sheet)
            for k, (im, lab, col) in enumerate(chunk):
                x, y = (k % COLS) * (W + 6), (k // COLS) * (H + 20)
                sheet.paste(im, (x, y + 18)); d.text((x + 2, y + 2), lab[:110], fill=col, font=F)
                d.rectangle((x, y + 18, x + W - 1, y + 18 + H - 1), outline=(180, 180, 180))
            sheet.save(os.path.join(out, f"{stop}{'' if len(tiles) <= PER else '_' + str(part // PER)}.png"))
    # summary
    for stop in sorted(os.listdir(cd)):
        ip = os.path.join(cd, stop, 'info.json')
        if not os.path.exists(ip): continue
        info = json.load(open(ip))
        for op in info['ops']:
            if 'file' in op and not op.get('_diff', True) and not op.get('dis'):
                print(f"{case} {stop} {op['label']}: no pixel change" + (' (MML same)' if op.get('_same_mml') else ' (MML CHANGED)'))
