# per-leaf best (dx,dy) of ours vs ref (CSS px, 0.5 steps) – pairs leaves in document order, groups by ref box height
import json, sys, numpy as np, collections
from PIL import Image
import os
d='evidence/ui/'
REF=os.environ.get('REFD','formulas_ref'); OURS=os.environ.get('OUT','formulas_ours')
stats=collections.defaultdict(list)
def lum(w,i): return np.array(Image.open(f'{d}{REF if w=="ref" else OURS}/{i}.png').convert('L')).astype(int)
for i in sorted(f[:2] for f in __import__('os').listdir(d+REF) if f.endswith('.json')):
    R=json.load(open(f'{d}{REF}/{i}.json'))['leaves']; O=json.load(open(f'{d}{OURS}/{i}.json'))['leaves']
    ra=lum('ref',i); oa=lum('ours',i)
    # clip origin: y offset 100 CSS above (leaf tops are clip-relative), x relative to container
    for r in R:
        o=[q for q in O if q[0]==r[0] and abs(q[1]-r[1])<4 and abs(q[2]-r[2])<4]
        if not o or r[0].strip() in ('','(',')'): continue
        o=o[0]
        x0=int(r[1]*2)-4; y0=int(r[2]*2)-4; w=int(r[3]*2)+10; h=int(r[4]*2)+10
        if x0<0 or y0<0: continue
        a=ra[y0:y0+h,x0:x0+w]
        best=None
        for dy in range(-4,5):
            for dx in range(-4,5):
                if y0+dy<0 or x0+dx<0: continue
                c=oa[y0+dy:y0+dy+h,x0+dx:x0+dx+w]
                if c.shape!=a.shape: continue
                e=np.abs(a-c).mean()
                if best is None or e<best[0]: best=(e,dx,dy)
        stats[(round(r[4]))].append((best[1]/2,best[2]/2))
        print(i,repr(r[0]),'h',r[4],'ours moves by (dx,dy)=',best[1]/2,best[2]/2)
for k,v in stats.items():
    v=np.array(v); print('height',k,'n',len(v),'median dx',np.median(v[:,0]),'median dy',np.median(v[:,1]))
