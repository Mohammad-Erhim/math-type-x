# best integer (2x-pixel) shift of ours vs ref per formula image, to expose systematic offsets
import sys, numpy as np
from PIL import Image
d='evidence/ui/'
for i in sorted(f[:2] for f in __import__('os').listdir(d+'formulas_ref') if f[0].isdigit()):
    a=np.array(Image.open(f'{d}formulas_ref/{i}.png').convert('L')).astype(int)[16:190, 20:560]
    b=np.array(Image.open(f'{d}formulas_ours/{i}.png').convert('L')).astype(int)
    best=None
    for dy in range(-4,5):
        for dx in range(-4,5):
            c=b[16+dy:16+dy+a.shape[0], 20+dx:20+dx+a.shape[1]]
            e=np.abs(a-c).mean()
            if best is None or e<best[0]: best=(e,dx,dy)
    base=np.abs(a-b[16:16+a.shape[0],20:20+a.shape[1]]).mean()
    print(i,'best shift of ours (dx,dy @2x px)=',best[1],best[2],'err %.2f (unshifted %.2f)'%(best[0],base))
