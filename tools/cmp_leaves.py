#!/usr/bin/env python3
"""compare leaf boxes of two shot_formulas runs: cmp_leaves.py refdir oursdir"""
import json,sys,glob,os
a,b=sys.argv[1],sys.argv[2]
names=sorted(os.path.basename(f) for f in glob.glob(a+'/*.json'))
tot=0;bad=0
for n in names:
    if not os.path.exists(b+'/'+n): continue
    ra=json.load(open(a+'/'+n)); rb=json.load(open(b+'/'+n))
    la=ra['leaves']; lb=rb['leaves']
    off=(ra['cb']['y']-rb['cb']['y'])  # ref and ours container offsets differ; leaves are relative to container already
    msg=[]
    if len(la)!=len(lb): msg.append(f'count {len(la)} vs {len(lb)}')
    # match by text in order
    sa=sorted(la,key=lambda t:(round(t[2]),round(t[1]),t[0])); sb=sorted(lb,key=lambda t:(round(t[2]),round(t[1]),t[0]))
    mx=0;worst=None
    for x,y in zip(sa,sb):
        d=max(abs(x[1]-y[1]),abs(x[2]-y[2]))
        if x[0]!=y[0]: d=99
        if d>mx: mx=d;worst=(x,y)
    tot+=1
    ok = mx<=1.0 and not msg
    if not ok: bad+=1
    print(n, 'OK ' if ok else 'XX ', f'max {mx:.1f}', msg, '' if ok else str(worst))
print('bad',bad,'of',tot)
