"""Compare two images: python3 tools/cmp.py ref.png ours.png out.png [scale]. Prints mean abs diff, writes stacked ref/ours/diff."""
import sys
from PIL import Image, ImageChops
a = Image.open(sys.argv[1]).convert('RGB')
b = Image.open(sys.argv[2]).convert('RGB')
w = min(a.width, b.width); h = min(a.height, b.height)
a = a.crop((0, 0, w, h)); b = b.crop((0, 0, w, h))
d = ImageChops.difference(a, b)
px = list(d.getdata())
mean = sum(sum(p) for p in px) / (3 * len(px))
bad = sum(1 for p in px if max(p) > 40) / len(px)
print('mean abs diff %.2f  pixels>40: %.2f%%' % (mean, bad * 100))
s = int(sys.argv[4]) if len(sys.argv) > 4 else 1
out = Image.new('RGB', (w * s, h * s * 3 + 4), (255, 0, 255))
for i, im in enumerate((a, b, d.point(lambda v: min(255, v * 3)))):
    out.paste(im.resize((w * s, h * s), Image.NEAREST), (0, i * (h * s + 2)))
out.save(sys.argv[3])
