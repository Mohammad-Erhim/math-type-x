"""caret geometry per stop, reference vs ours: python3 tools/ctx_carets.js ref.json ours.json [tolerance]"""
import json, sys
ref = json.load(open(sys.argv[1])); ours = json.load(open(sys.argv[2]))
tol = int(sys.argv[3]) if len(sys.argv) > 3 else 0
bad_cases = 0
tot = bad = 0
for name, r in ref.items():
    o = ours.get(name)
    if not o: continue
    rs, os_ = r['stops'], o['stops']
    if len(rs) != len(os_):
        bad_cases += 1
        print(f'{name}: stops ref {len(rs)} ours {len(os_)}')
        continue
    diffs = []
    for i, (a, b) in enumerate(zip(rs, os_)):
        tot += 1
        ca = a['caret'][-1] if a['caret'] else None
        cb = b['caret'][-1] if b['caret'] else None
        if ca is None or cb is None:
            if ca != cb: diffs.append((i, ca, cb))
            continue
        if any(abs(x - y) > tol for x, y in zip(ca, cb)):
            diffs.append((i, ca, cb))
    if diffs:
        bad_cases += 1
        bad += len(diffs)
        print(f'{name}: ' + '; '.join(f'[{i}] ref {a} ours {b}' for i, a, b in diffs[:6]))
print(f'{tot - bad}/{tot} stops equal, {bad_cases} cases differ')
