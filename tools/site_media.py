#!/usr/bin/env python3
"""Makes the web-ready images of the website in site/media from the README media in docs/media: WebP screenshots with the
sizes the pages ask for, the video poster, the favicon set and the social-share cards (Open Graph, 1200x630).
usage: python3 tools/site_media.py   (needs Pillow with raqm and ffmpeg; the outputs are committed, the site build does not run this)"""
import os, subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC, OUT = os.path.join(ROOT, 'docs', 'media'), os.path.join(ROOT, 'site', 'media')
FD = os.path.join(ROOT, 'server', 'fonts')
os.makedirs(OUT, exist_ok=True)
NAVY, TEAL, ORANGE = (16, 33, 52), (38, 166, 154), (255, 149, 0)

# screenshots: (source, output name, width in px)
SHOTS = [
    ('editor-en.png', 'editor-en', 1200), ('editor-ar.png', 'editor-ar', 1200), ('toolbar-scripts.png', 'toolbar', 1200),
    ('arabic-letters-palette.png', 'arabic-letters-palette', 1000), ('arabic-math-letters.png', 'arabic-math-letters', 1000),
    ('arabic-marks.png', 'arabic-marks', 600), ('export-png.png', 'export-png', 1200), ('enable-arabic.png', 'enable-arabic', 1200),
    ('phone.png', 'phone', 420),
]
for src, name, w in SHOTS:
    im = Image.open(os.path.join(SRC, src)).convert('RGB')
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), quality=84, method=6)
    print(name, im.size)

# the hero pictures: the editor without its output panel
for src, name in (('editor-en.png', 'hero-en'), ('editor-ar.png', 'hero-ar')):
    im = Image.open(os.path.join(SRC, src)).convert('RGB')
    im = im.crop((0, 0, im.width, round(im.width * 0.405))).resize((1100, round(1100 * 0.405)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), quality=86, method=6)
    print(name, im.size)

# the videos and the poster
subprocess.run(['ffmpeg', '-nostdin', '-y', '-loglevel', 'error', '-i', os.path.join(SRC, 'demo.mp4'), '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-crf', '24', '-preset', 'slow', '-movflags', '+faststart', '-an', os.path.join(OUT, 'demo.mp4')], check=True)
subprocess.run(['ffmpeg', '-nostdin', '-y', '-loglevel', 'error', '-ss', '1.5', '-i', os.path.join(SRC, 'demo.mp4'), '-frames:v', '1', '-vf', 'scale=1280:-2', os.path.join(OUT, 'poster.png')], check=True)
Image.open(os.path.join(OUT, 'poster.png')).convert('RGB').save(os.path.join(OUT, 'demo-poster.webp'), quality=82, method=6)
os.remove(os.path.join(OUT, 'poster.png'))
subprocess.run(['ffmpeg', '-nostdin', '-y', '-loglevel', 'error', '-i', os.path.join(SRC, 'nudge.mp4'), '-vf', 'scale=960:-2', '-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-movflags', '+faststart', '-an', os.path.join(OUT, 'position.mp4')], check=True)
subprocess.run(['ffmpeg', '-nostdin', '-y', '-loglevel', 'error', '-ss', '5', '-i', os.path.join(SRC, 'nudge.mp4'), '-frames:v', '1', '-vf', 'scale=960:-2', os.path.join(OUT, 'p.png')], check=True)
Image.open(os.path.join(OUT, 'p.png')).convert('RGB').save(os.path.join(OUT, 'position-poster.webp'), quality=82, method=6)
os.remove(os.path.join(OUT, 'p.png'))


def gradient(w, h):
    g = Image.new('RGB', (w, h))
    px = g.load()
    for y in range(h):
        for x in range(w):
            t = x / w * 0.55 + y / h * 0.45
            px[x, y] = tuple(round(NAVY[i] + (c - NAVY[i]) * t) for i, c in enumerate((22, 78, 96)))
    return g


def logo(size):
    """the app icon: a teal square with a white radical sign and an x"""
    s = size * 4
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=NAVY)
    d.rounded_rectangle((int(s * 0.06), int(s * 0.06), int(s * 0.94), int(s * 0.94)), radius=int(s * 0.17), outline=TEAL, width=max(2, int(s * 0.035)))
    w = max(3, int(s * 0.075))
    pts = [(s * 0.18, s * 0.55), (s * 0.28, s * 0.50), (s * 0.38, s * 0.74), (s * 0.52, s * 0.28), (s * 0.84, s * 0.28)]
    d.line(pts, fill=(255, 255, 255, 255), width=w, joint='curve')
    xf = ImageFont.truetype(os.path.join(FD, 'LiberationSans-BoldItalic.ttf'), int(s * 0.34))
    d.text((s * 0.57, s * 0.43), 'x', font=xf, fill=(*ORANGE, 255))
    return im.resize((size, size), Image.LANCZOS)


for n in (32, 180, 192, 512):
    logo(n).save(os.path.join(OUT, f'icon-{n}.png'))
logo(512).save(os.path.join(OUT, 'logo.png'))

BOLD = lambda n: ImageFont.truetype(os.path.join(FD, 'LiberationSans-Bold.ttf'), n)
REG = lambda n: ImageFont.truetype(os.path.join(FD, 'LiberationSans-Regular.ttf'), n)
AR = lambda n: ImageFont.truetype(os.path.join(FD, 'MtxNotoNaskh-Bold.ttf'), n, layout_engine=ImageFont.Layout.RAQM)


def og(name, title, sub, ar_line=None, ar=False):
    im = gradient(1200, 630)
    d = ImageDraw.Draw(im)
    ic = logo(120)
    im.paste(ic, (70, 66), ic)
    d.text((210, 92), 'MathTypeX', font=BOLD(58), fill=(255, 255, 255))
    if ar:
        d.text((1130 - d.textlength(title, font=AR(76)), 250), title, font=AR(76), fill=(255, 255, 255), direction='rtl', language='ar')
        d.text((1130 - d.textlength(sub, font=AR(40)), 380), sub, font=AR(40), fill=(190, 225, 222), direction='rtl', language='ar')
    else:
        d.text((70, 250), title, font=BOLD(70), fill=(255, 255, 255))
        d.text((70, 360), sub, font=REG(36), fill=(190, 225, 222))
        if ar_line:
            d.text((70, 440), ar_line, font=AR(46), fill=(125, 220, 210), direction='rtl', language='ar')
    shot = Image.open(os.path.join(SRC, 'editor-en.png' if not ar else 'editor-ar.png')).convert('RGB')
    shot = shot.resize((560, round(shot.height * 560 / shot.width)), Image.LANCZOS)
    d.rounded_rectangle((590 - 6, 460 - 6, 590 + 560 + 6, 630 + 6), radius=12, fill=(255, 255, 255))
    im.paste(shot.crop((0, 0, 560, 170)), (590, 460))
    im.convert('RGB').save(os.path.join(OUT, name + '.png'), optimize=True)


og('og-home', 'Write math online', 'A visual equation editor that runs in your browser', 'محرر معادلات يدعم العربية')
og('og-home-ar', 'اكتب المعادلات الرياضية', 'محرر معادلات مرئي يعمل في المتصفح، مع دعم عربي متكامل', ar=True)
print('done')
