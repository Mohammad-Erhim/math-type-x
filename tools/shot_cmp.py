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
# side by side crops (reference | ours), magnified, one image per formula and a sheet of them
pairs = []
for i in range(n):
    a = Image.open(f'{d}/{i}_ref.png').convert('RGB'); b = Image.open(f'{d}/{i}_ours.png').convert('RGB')
    w, h = a.size
    box = (0, 0, w // 2, h // 2)
    pair = Image.new('RGB', (w + 12, h // 2 * 1), 'red')
    pair.paste(a.crop((0, 0, w // 2, h // 2)), (0, 0)); pair.paste(b.crop((0, 0, w // 2, h // 2)), (w // 2 + 12, 0))
    pairs.append(pair.resize((pair.width * 2, pair.height * 2), Image.NEAREST))
sheet = Image.new('RGB', (pairs[0].width, sum(p.height for p in pairs)), 'white')
y = 0
for p in pairs:
    sheet.paste(p, (0, y)); y += p.height
sheet.save(f'{d}/pairs.png')
