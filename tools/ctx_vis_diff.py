#!/usr/bin/env python3
"""Compare the visual effect of every contextual control in the reference and in our build (tools/ctx_audit.js output of
both).  usage: ctx_vis_diff.py <ref_dir> <ours_dir> [case…]
classes: REF-ONLY (the reference moves/redraws the formula, ours does not), OURS-ONLY, DIFF (both change, differently),
SAME (both change alike), NONE (neither changes pixels although the MathML did = no visible effect anywhere)"""
import json, os, sys
from PIL import Image, ImageChops
ref, ours = sys.argv[1], sys.argv[2]
want = sys.argv[3:]
BOX = (3, 103, 722, 412)
def ink(im):
    g = im.convert('L').crop(BOX).point(lambda v: 255 if v < 200 else 0)
    return g.getbbox()
def load(path): return Image.open(path).convert('RGB')
summary = {}
for case in sorted(os.listdir(ours)):
    if case.endswith('_sheets') or (want and case not in want): continue
    cd_o, cd_r = os.path.join(ours, case), os.path.join(ref, case)
    if not os.path.isdir(cd_r): continue
    for stop in sorted(os.listdir(cd_o)):
        io, ir = os.path.join(cd_o, stop, 'info.json'), os.path.join(cd_r, stop, 'info.json')
        if not (os.path.exists(io) and os.path.exists(ir)): 
            if os.path.exists(io): print(f'{case} {stop}: no reference stop'); 
            continue
        jo, jr = json.load(open(io)), json.load(open(ir))
        bo, br = load(os.path.join(cd_o, stop, 'before_h.png')), load(os.path.join(cd_r, stop, 'before_h.png'))
        so, sr = [c['t'] for c in jo['sig']], [c['t'] for c in jr['sig']]
        if so != sr: print(f'{case} {stop}: controls differ\n   ref  {sr}\n   ours {so}')
        rops = {o['label']: o for o in jr['ops']}
        for op in jo['ops']:
            lab = op['label']
            r = rops.get(lab)
            if r is None or 'file' not in op or 'file' not in r: continue
            if op.get('len'): continue
            ao = load(os.path.join(cd_o, stop, op['file'] + '_h.png')); ar = load(os.path.join(cd_r, stop, r['file'] + '_h.png'))
            co = ImageChops.difference(bo.crop(BOX), ao.crop(BOX)).getbbox() is not None
            cr = ImageChops.difference(br.crop(BOX), ar.crop(BOX)).getbbox() is not None
            io_b, ia_b = ink(bo), ink(ao)
            ir_b, ir_a = ink(br), ink(ar)
            def delta(b, a):
                if not b or not a: return None
                return tuple(a[i] - b[i] for i in range(4))
            do_, dr = delta(io_b, ia_b), delta(ir_b, ir_a)
            if co and cr:
                cls = 'SAME' if (do_ and dr and max(abs(do_[i] - dr[i]) for i in range(4)) <= 2) else 'DIFF'
            elif cr and not co: cls = 'REF-ONLY'
            elif co and not cr: cls = 'OURS-ONLY'
            else: cls = 'NONE' if op.get('mml') != jo['mml'] else 'NOOP'
            mml_same = (r.get('mml') or '') .replace(' ', '') == (op.get('mml') or '').replace(' ', '')
            summary.setdefault(cls, []).append((case, stop, lab, do_, dr, mml_same))
for cls in ['REF-ONLY', 'OURS-ONLY', 'DIFF', 'NONE', 'SAME', 'NOOP']:
    items = summary.get(cls, [])
    print(f'== {cls}: {len(items)}')
    if cls in ('SAME', 'NOOP'): continue
    for case, stop, lab, do_, dr, mml_same in items:
        print(f'  {case} {stop} {lab}  ours-delta={do_} ref-delta={dr}  mml{"=" if mml_same else "≠"}ref')
