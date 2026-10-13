#!/usr/bin/env python3
"""s10b: compare our combined run with the reference's per-structure recordings (known flakes filtered)"""
import json,glob,re,collections,sys
ours=json.load(open('evidence/ours/sc/s10b_ctx_all.json'))['steps']
od={s.get('desc'):s for s in ours}
def norm(x):
    return re.sub(r'&#x([0-9A-Fa-f]+);',lambda m:chr(int(m.group(1),16)),x) if isinstance(x,str) else x
tot=0; cats=collections.Counter(); ex=[]
for f in sorted(glob.glob('evidence/scenarios/s10b_ctx_*.json')):
    for s in json.load(open(f))['steps']:
        d=s.get('desc'); o=od.get(d)
        if o is None: cats['missing']+=1; continue
        if s.get('err') or o.get('err'): cats['err']+=1; continue
        tot+=1
        # recordings typed into length fields before the input had focus (tests/length.test.ts replays s23)
        if re.search(r'type "', d or ''): continue
        mr=norm(s.get('mathml')); mo=norm(o.get('mathml'))
        if mr!=mo:
            cats['mathml']+=1; ex.append((d,str(mr)[:160],str(mo)[:160]))
        er=s.get('extra'); eo=o.get('extra')
        if isinstance(er,list) and er and all(isinstance(x,str) for x in er) and not any('|' in x for x in er):
            a=sorted(x for x in er if not x.endswith('lines')); b=sorted(x for x in (eo or []) if isinstance(x,str) and not x.endswith('lines'))
            if a!=b:
                cats['toggles']+=1; ex.append((d,'TOGGLES '+str(a),str(b)))
print(tot,dict(cats))
for e in ex[:int(sys.argv[1]) if len(sys.argv)>1 else 25]: print(e[0]); print('   R',e[1]); print('   O',e[2])
