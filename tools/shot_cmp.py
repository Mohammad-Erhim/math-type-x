"""stack the crops of tools/shot_cmp.js (ref above ours, magnified 3x) and count differing pixels: python3 tools/shot_cmp.py outdir n"""
import sys
from PIL import Image, ImageChops
d, n = sys.argv[1], int(sys.argv[2])
rows = []
for i in range(n):
    a = Image.open(f'{d}/{i}_ref.png').convert('RGB'); b = Image.open(f'{d}/{i}_ours.png').convert('RGB')
    diff = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 40 else 0)
    print(i, 'differing px', sum(1 for v in diff.getdata() if v))
    rows += [a, b, diff.convert('RGB')]
W = rows[0].width; H = rows[0].height
out = Image.new('RGB', (W, H * len(rows)), 'white')
for k, r in enumerate(rows): out.paste(r, (0, k * H))
out = out.resize((out.width * 3 // 2, out.height * 3 // 2), Image.NEAREST)
out.save(f'{d}/all.png')
