#!/usr/bin/env python3
"""Turns the frames of tools/readme_demo.js into docs/media/<name>.gif and <name>.mp4: title and closing cards, a pointer that
travels to every control with a click ripple, a zoomed inset of the formula, cross-fades.
usage: python3 tools/readme_demo.py <framesdir> <outdir> <name>   (needs Pillow with raqm, and ffmpeg)"""
import json, math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, OUT, NAME = sys.argv[1], sys.argv[2], sys.argv[3]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FD = os.path.join(ROOT, 'server', 'fonts')
BOLD = lambda n: ImageFont.truetype(os.path.join(FD, 'LiberationSans-Bold.ttf'), n)
REG = lambda n: ImageFont.truetype(os.path.join(FD, 'LiberationSans-Regular.ttf'), n)
AR = lambda n: ImageFont.truetype(os.path.join(FD, 'MtxNotoNaskh-Bold.ttf'), n, layout_engine=ImageFont.Layout.RAQM)
frames = json.load(open(os.path.join(SRC, 'frames.json')))
# a part of the recording as a clip of its own: RANGE=a:b (frame numbers), CARDS=0 (no title / closing card)
if os.environ.get('RANGE'):
    a, b = [int(v) for v in os.environ['RANGE'].split(':')]
    frames = frames[a:b]
CARDS = os.environ.get('CARDS', '1') != '0'
W, BAND, CSS, FPS = 1920, 124, 960, 30
OUTF = os.path.join(SRC, 'composed')
os.system(f'rm -rf "{OUTF}"')
os.makedirs(OUTF)
NAVY, TEAL, ORANGE = (16, 33, 52), (38, 166, 154), (255, 149, 0)
ZOOM_BOX, ZOOM = (735, 176, 940, 226), 2.2

seq = []  # (png path, seconds)
n = 0


def save(im, sec):
    global n
    p = os.path.join(OUTF, f'{n:05d}.png')
    im.save(p)
    n += 1
    seq.append((p, sec))


def ease(t):
    return t * t * (3 - 2 * t)


def gradient(w, h):
    g = Image.new('RGB', (w, h))
    px = g.load()
    for y in range(h):
        for x in range(0, w):
            t = (x / w * 0.55 + y / h * 0.45)
            px[x, y] = tuple(round(NAVY[i] + (c - NAVY[i]) * t) for i, c in enumerate((22, 78, 96)))
    return g


def centered(d, y, text, font, fill, w=W):
    d.text(((w - d.textlength(text, font=font)) / 2, y), text, font=font, fill=fill)


def card(kind):
    h = 1120 + BAND
    im = gradient(W, h)
    d = ImageDraw.Draw(im)
    if kind == 'title':
        centered(d, 330, 'MathTypeX', BOLD(150), (255, 255, 255))
        ar = 'محرر المعادلات الرياضية'
        d.text(((W - d.textlength(ar, font=AR(78))) / 2, 520), ar, font=AR(78), fill=(180, 235, 228), direction='rtl', language='ar')
        centered(d, 690, 'A complete web equation editor – with first-class Arabic support', REG(44), (215, 228, 238))
        chips = ['Visual equation editing', 'English & Arabic', 'Arabic math letters', 'Pixel-precise positioning']
        widths = [d.textlength(c, font=BOLD(30)) + 56 for c in chips]
        x = (W - sum(widths) - 24 * (len(chips) - 1)) / 2
        for c, wd in zip(chips, widths):
            d.rounded_rectangle((x, 800, x + wd, 862), radius=31, outline=(120, 200, 195), width=3)
            d.text((x + 28, 812), c, font=BOLD(30), fill=(235, 245, 245))
            x += wd + 24
    else:
        centered(d, 360, 'MathTypeX', BOLD(130), (255, 255, 255))
        centered(d, 560, 'Write mathematics the way it is printed – in English and Arabic.', REG(52), (205, 232, 230))
        centered(d, 700, 'Runs in any browser  ·  Exports PNG images  ·  Works on phones', REG(34), (160, 195, 205))
    return im


def pointer(im, x, y, press=0.0):
    d = ImageDraw.Draw(im, 'RGBA')
    s = 1.0 - 0.12 * press
    pts = [(0, 0), (0, 40), (10, 31), (17, 46), (25, 42), (18, 28), (31, 28)]
    poly = [(x + px * s * 1.15, y + py * s * 1.15) for px, py in pts]
    d.polygon([(a + 3, b + 4) for a, b in poly], fill=(0, 0, 0, 70))
    d.polygon(poly, fill=(255, 255, 255, 255), outline=(15, 15, 15, 255))
    d.line(poly + [poly[0]], fill=(15, 15, 15, 255), width=3, joint='curve')


def compose(f, ptr=None, ring=False, ripple=0.0, press=0.0):
    im = Image.open(os.path.join(SRC, f['file'])).convert('RGB')
    k = im.width / CSS
    base = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    s = W / CSS
    d = ImageDraw.Draw(base, 'RGBA')
    if f.get('inset', True) and (f.get('fbox') or f.get('zbox')):
        # a magnified view of the whole formula (or of another box, such as the exported image), with some margin, placed on the
        # empty side of the editor canvas
        fx, fy, fw, fh = f.get('zbox') or f['fbox']
        dx, dy, dw, dh = (0, 0, CSS, 560) if f.get('zbox') else f['dbox']
        # visible part of the formula, with a margin and a minimum size so that small formulas get a roomy box
        vx0, vy0, vx1, vy1 = max(fx, dx), max(fy, dy), min(fx + fw, dx + dw - 2), min(fy + fh, dy + dh)
        cw, ch = max(vx1 - vx0 + 20, 120), max(vy1 - vy0 + 20, 60)
        x1 = min(dx + dw - 2, max(vx1 + 10, vx0 - 10 + cw))
        x0 = max(dx + 2, x1 - cw)
        y0 = max(dy + 2, min(vy0 - 10, dy + dh - 2 - ch))
        y1 = min(dy + dh - 2, y0 + ch)
        cw, ch = x1 - x0, y1 - y0
        z = min(3.2, 470 / cw, 118 / ch)
        crop = im.crop((round(x0 * k), round(y0 * k), round(x1 * k), round(y1 * k)))
        zw, zh = round(cw * s * z), round(ch * s * z)
        crop = crop.resize((zw, zh), Image.LANCZOS)
        right_side = (fx + fw / 2) > 480 or bool(f.get('zbox'))
        ix = (dx + 32 if right_side else dx + dw - 32 - cw * z) * s
        iy = 190 * s
        shadow = Image.new('RGBA', base.size, (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle((ix - 4, iy + 2, ix + zw + 14, iy + zh + 20), radius=16, fill=(0, 0, 0, 70))
        base.paste(Image.alpha_composite(base.convert('RGBA'), shadow.filter(ImageFilter.GaussianBlur(10))).convert('RGB'))
        d = ImageDraw.Draw(base, 'RGBA')
        d.rounded_rectangle((ix - 8, iy - 8, ix + zw + 8, iy + zh + 8), radius=14, fill=(255, 255, 255, 255), outline=(*NAVY, 255), width=3)
        base.paste(crop, (round(ix), round(iy)))
        d.text((ix + 6, iy + 2), 'ZOOM', font=BOLD(18), fill=(*TEAL, 255))
    if f.get('ring') and ring:
        x, y, w, h = [v * s for v in f['ring']]
        d.rounded_rectangle((x - 6, y - 6, x + w + 6, y + h + 6), radius=12, outline=(*ORANGE, 255), width=6)
        d.rounded_rectangle((x - 16, y - 16, x + w + 16, y + h + 16), radius=20, outline=(*ORANGE, 90), width=4)
    if ripple > 0 and ptr:
        r = 14 + 70 * ripple
        d.ellipse((ptr[0] - r, ptr[1] - r, ptr[0] + r, ptr[1] + r), outline=(*ORANGE, round(255 * (1 - ripple))), width=6)
    if ptr:
        pointer(base, ptr[0], ptr[1], press)
    out = Image.new('RGB', (W, base.height + BAND), NAVY)
    out.paste(base, (0, 0))
    od = ImageDraw.Draw(out)
    x = 48
    if f.get('chip'):
        c = f['chip']
        cw = od.textlength(c, font=BOLD(24)) + 40
        od.rounded_rectangle((x, base.height + 36, x + cw, base.height + 36 + 52), radius=26, fill=TEAL)
        od.text((x + 20, base.height + 46), c, font=BOLD(24), fill=(255, 255, 255))
        x += cw + 28
    od.text((x, base.height + 34), f['caption'], font=BOLD(40), fill=(255, 255, 255))
    return out


def fade(a, b, secs=0.5):
    steps = max(2, round(secs * FPS))
    for i in range(1, steps):
        save(Image.blend(a, b, ease(i / steps)), 1 / FPS)


# PREVIEW=3,10,26 writes just those frames (and the cards, as 'title' / 'outro') for a look before the long render
if os.environ.get('PREVIEW'):
    os.makedirs(OUT, exist_ok=True)
    for i in [int(v) for v in os.environ['PREVIEW'].split(',') if v]:
        compose(frames[i], ptr=(W - 500, 300) if frames[i].get('ring') else None, ring=True).save(os.path.join(OUT, f'preview_{i:02d}.png'))
    card('title').save(os.path.join(OUT, 'preview_title.png'))
    card('outro').save(os.path.join(OUT, 'preview_outro.png'))
    sys.exit(0)

# ---- build the sequence
ptr = None
if CARDS:
    title = card('title')
    save(title, 3.4)
    fade(title, compose(frames[0]), 0.6)
for fi, f in enumerate(frames):
    target = None
    if f.get('ring'):
        x, y, w, h = [v * (W / CSS) for v in f['ring']]
        target = (x + w * 0.55, y + h * 0.45)
    travel = 0.0
    if target and ptr is None:
        ptr = (W - 120, 900)
    if target:
        # the pointer travels to the control (ease in / out), then rests on it with the ring, then clicks
        travel = min(0.55, max(0.3, math.hypot(target[0] - ptr[0], target[1] - ptr[1]) / 2600))
        steps = round(travel * FPS)
        for i in range(1, steps + 1):
            t = ease(i / steps)
            p = (ptr[0] + (target[0] - ptr[0]) * t, ptr[1] + (target[1] - ptr[1]) * t - 40 * math.sin(math.pi * t))
            save(compose(f, ptr=p, ring=False), 1 / FPS)
        ptr = target
        hold = max(0.35, f['ms'] / 1000 - travel - 0.25)
        save(compose(f, ptr=ptr, ring=True), hold)
        for i in range(1, 6):
            save(compose(f, ptr=ptr, ring=True, ripple=i / 5, press=1.0 if i < 3 else 0.0), 1 / FPS)
    else:
        if fi > 0 and frames[fi - 1].get('chip') != f.get('chip') and fi > 0:
            pass
        save(compose(f, ptr=ptr), f['ms'] / 1000)
if CARDS:
    outro = card('outro')
    fade(compose(frames[-1], ptr=ptr), outro, 0.7)
    save(outro, 3.0)

lst = os.path.join(OUTF, 'list.txt')
with open(lst, 'w') as fh:
    for p, sec in seq:
        fh.write(f"file '{p}'\nduration {sec:.4f}\n")
    fh.write(f"file '{seq[-1][0]}'\n")
os.makedirs(OUT, exist_ok=True)
mp4, gif = os.path.join(OUT, NAME + '.mp4'), os.path.join(OUT, NAME + '.gif')
run = lambda *a: subprocess.run(['ffmpeg', '-nostdin', '-y', '-loglevel', 'error', *a], check=True)
run('-f', 'concat', '-safe', '0', '-i', lst, '-vf', f'fps={FPS},scale=1920:-2:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart', mp4)
pal = os.path.join(OUTF, 'palette.png')
run('-i', mp4, '-vf', 'fps=10,scale=900:-1:flags=lanczos,palettegen=max_colors=128:stats_mode=full', pal)
run('-i', mp4, '-i', pal, '-lavfi', 'fps=10,scale=900:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4', gif)
total = sum(s for _, s in seq)
print(f'{total:.1f} s;', mp4, os.path.getsize(mp4) // 1024, 'KB;', gif, os.path.getsize(gif) // 1024, 'KB')
