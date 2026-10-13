"""Differential comparison of scenario runs: python3 tools/diff_scn.py s02_tabs_kbd [...]  (ref: evidence/scenarios, ours: evidence/ours/sc)"""
import json, sys, re
def norm_net(lst):
    out = []
    for n in lst or []:
        m = re.match(r'(POST|GET) \S*/(editor|editor-services|hand)/?([A-Za-z0-9_./]+?)(\?|\s|$)', n)
        out.append(m.group(3) if m else n[:60])
    return out
tot = bad = 0
for name in sys.argv[1:]:
    ref = json.load(open(f'evidence/scenarios/{name}.json'))['steps']
    try:
        ours = json.load(open(f'evidence/ours/sc/{name}.json'))['steps']
    except Exception as e:
        print(name, 'MISSING ours', e); continue
    print(f'== {name}: ref {len(ref)} steps, ours {len(ours)}')
    for r, o in zip(ref, ours):
        tot += 1
        diffs = []
        if r.get('mathml') != o.get('mathml'): diffs.append(('mathml', r.get('mathml'), o.get('mathml')))
        re_, oe = r.get('extra'), o.get('extra')
        def strip(x):
            if isinstance(x, dict) and 'lastBodies' in x:
                x = {k: v for k, v in x.items() if k != 'lastBodies'}
            return x
        if strip(re_) != strip(oe): diffs.append(('extra', re_, oe))
        if bool(o.get('err')) != bool(r.get('err')): diffs.append(('err', r.get('err'), o.get('err')))
        if o.get('errors'): diffs.append(('pageerrors', None, o.get('errors')))
        if diffs:
            bad += 1
            print(f"  step {r['n']} {r['desc'][:90]}")
            for k, a, b in diffs:
                print(f"     {k}: ref={json.dumps(a)[:260]}\n          ours={json.dumps(b)[:260]}")
    if len(ref) != len(ours): print('  step count differs')
print(f'steps with differences: {bad}/{tot}')
