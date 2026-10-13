"""compare two ctx_matrix.js outputs (reference vs ours): python3 tools/ctx_diff.py ref.json ours.json [effects]"""
import json, sys
ref = json.load(open(sys.argv[1])); ours = json.load(open(sys.argv[2]))
def sigs(sig):
    return [(c['k'], c['t'], c.get('v') if c['k'] == 's' else None, tuple(c.get('o', [])) if c['k']=='s' else None, c.get('on'), c.get('dis')) for c in sig]
def short(sig):
    return ', '.join(f"{c['t']}{'*' if c.get('on') else ''}{'!' if c.get('dis') else ''}{'='+c['v'] if c['k']=='s' else ''}" for c in sig) or '-'
tot = bad = 0
for name, r in ref.items():
    o = ours.get(name)
    if not o:
        print(name, 'MISSING in ours'); continue
    rs, os_ = r['stops'], o['stops']
    n = max(len(rs), len(os_))
    if len(rs) != len(os_):
        print(f'{name}: stop count ref {len(rs)} ours {len(os_)}')
    for i in range(min(len(rs), len(os_))):
        tot += 1
        a, b = sigs(rs[i]['sig']), sigs(os_[i]['sig'])
        if a != b:
            bad += 1
            print(f'{name}[{i}]\n   ref : {short(rs[i]["sig"])}\n   ours: {short(os_[i]["sig"])}')
        if len(sys.argv) > 3:
            fa, fb = rs[i].get('fx', {}), os_[i].get('fx', {})
            for k in sorted(set(fa) | set(fb)):
                tot += 1
                ma, mb = fa.get(k, {}), fb.get(k, {})
                if ma.get('mml') != mb.get('mml') or sigs(ma.get('sig', [])) != sigs(mb.get('sig', [])):
                    bad += 1
                    print(f'{name}[{i}] {k}\n   ref : {ma.get("mml") or ma.get("err")}  | {short(ma.get("sig", []))}\n   ours: {mb.get("mml") or mb.get("err")}  | {short(mb.get("sig", []))}')
print(f'{tot - bad}/{tot} equal')
