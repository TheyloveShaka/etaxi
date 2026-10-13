import json, math, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = 'assets/out'
info = json.load(open(f'{OUT}/van-side.json'))
van = Image.open(f'{OUT}/van-side.png').convert('RGBA')
bx0, by0 = info['crop_box'][0], info['crop_box'][1]
S = 2
TOP = 150
van = van.resize((van.width * S, van.height * S), Image.LANCZOS)

al = van.getchannel('A')
m = al.point(lambda v: 255 if v > 150 else 0)
pad = Image.new('L', (m.width + 2, m.height + 2), 0); pad.paste(m, (1, 1))
ImageDraw.floodfill(pad, (pad.width // 2, pad.height // 2), 128)
main = pad.crop((1, 1, pad.width - 1, pad.height - 1)).point(lambda v: 255 if v == 128 else 0).filter(ImageFilter.MaxFilter(3))
van.putalpha(Image.composite(al, Image.new('L', al.size, 0), main))

canvas = Image.new('RGBA', (van.width, van.height + TOP), (0, 0, 0, 0))
canvas.paste(van, (0, TOP))
P = lambda x, y: ((x - bx0) * S, (y - by0) * S + TOP)

BLUE = (15, 116, 204, 255); BAND = (30, 150, 222, 255); INK = (11, 18, 32, 255); WHITE = (255, 255, 255, 255); LEAF = (11, 122, 70, 255)
arr = np.asarray(canvas).astype(int)
bandy = P(0, (info['band'][0] + info['band'][1]) / 2)[1]
sx = P(info['first_sq_x'] + info['sq_w'] / 2, 0)[0]
BAND = tuple(int(v) for v in arr[int(bandy), int(sx), :3]) + (255,)

Q = 4
ov = Image.new('RGBA', (canvas.width * Q, canvas.height * Q), (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
font = lambda px: ImageFont.truetype('assets/fonts/panchang-700.ttf', int(px * Q))
q = lambda *v: [int(round(x * Q)) for x in v]

wh = info['wheels_raw'][0]
cx, cy = P(wh['cx'], info['band'][1] + 39)
R = 31 * S
for i in range(14):
    a0 = i * 360 / 14 - 90 - 7; a1 = a0 + 14
    d.arc(q(cx - R, cy - R, cx + R, cy + R), a0, a1, fill=BAND, width=int(8 * S * Q / 2))
tf = font(40 * S / 2 * 1.5)
tb = d.textbbox((0, 0), 'T', font=tf)
d.text((cx * Q - (tb[0] + tb[2]) / 2, cy * Q - (tb[1] + tb[3]) / 2), 'T', font=tf, fill=BAND)

roof = P(0, info['roof_y'])[1]
sw, sh = 250 * S / 2 * 1.5, 62 * S / 2 * 1.5
scx = canvas.width * 0.56
x0, y1 = scx - sw / 2, roof + 6
y0 = y1 - sh - 14
d.rectangle(q(x0 + 26, y1 - 16, x0 + 44, y1), fill=INK)
d.rectangle(q(x0 + sw - 44, y1 - 16, x0 + sw - 26, y1), fill=INK)
d.rounded_rectangle(q(x0, y0, x0 + sw, y0 + sh), radius=int(9 * Q), fill=WHITE, outline=INK, width=int(4 * Q))
cell = sh
d.rounded_rectangle(q(x0, y0, x0 + cell, y0 + sh), radius=int(9 * Q), fill=BLUE)
d.rectangle(q(x0 + cell - 12, y0, x0 + cell, y0 + sh), fill=BLUE)
f1 = font(sh * 0.62)
b = d.textbbox((0, 0), 'T', font=f1)
d.text(((x0 + cell / 2) * Q - (b[0] + b[2]) / 2, (y0 + sh / 2) * Q - (b[1] + b[3]) / 2), 'T', font=f1, fill=WHITE)
f2 = font(sh * 0.40)
be = d.textbbox((0, 0), 'e', font=f2); bt = d.textbbox((0, 0), 'taxi', font=f2); ball = d.textbbox((0, 0), 'etaxi', font=f2)
tx = (x0 + cell + (sw - cell) / 2) * Q - (ball[0] + ball[2]) / 2
ty = (y0 + sh / 2) * Q - (ball[1] + ball[3]) / 2
d.text((tx, ty), 'e', font=f2, fill=LEAF)
d.text((tx + d.textlength('e', font=f2), ty), 'taxi', font=f2, fill=INK)
ov = ov.resize(canvas.size, Image.LANCZOS)
canvas = Image.alpha_composite(canvas, ov)

a = np.asarray(canvas)
ys, xs = np.where(a[..., 3] > 40)
canvas = canvas.crop((0, max(ys.min() - 6, 0), canvas.width, canvas.height))
offy = max(ys.min() - 6, 0)
a = np.asarray(canvas).astype(float) / 255
lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
Wd, Hd = canvas.size
wheels = []
yy, xx = np.mgrid[0:Hd, 0:Wd]
for wraw in info['wheels_raw']:
    wx = P(wraw['cx'], 0)[0]; bottom = P(0, wraw['bottom'])[1] - offy
    gx, gy = wx, bottom - 154
    for _ in range(3):
        near = ((xx - gx) ** 2 + (yy - gy) ** 2) < 122 ** 2
        bright = near & (lum > 0.48)
        by_, bx_ = np.where(bright)
        gx, gy = bx_.mean(), by_.mean()
    r_hub = float(np.percentile(np.hypot(bx_ - gx, by_ - gy), 97))
    wheels.append({'cx': gx, 'cy': gy, 'r_hub': r_hub, 'r_tyre': bottom - gy, 'bottom': bottom})
geo = {'width': Wd, 'height': Hd, 'ground_y_pct': round(100 * wheels[0]['bottom'] / Hd, 3), 'wheels': []}
for i, w in enumerate(wheels):
    r = int(w['r_hub'] + 7)
    box = (int(w['cx'] - r), int(w['cy'] - r), int(w['cx'] + r), int(w['cy'] + r))
    disc = canvas.crop(box)
    mask = Image.new('L', (disc.width * 4, disc.height * 4), 0)
    ImageDraw.Draw(mask).ellipse((2, 2, mask.width - 3, mask.height - 3), fill=255)
    disc.putalpha(mask.resize(disc.size, Image.LANCZOS))
    name = ['wheel-front', 'wheel-rear'][i]
    disc.save(f'{OUT}/{name}.webp', quality=90, method=6)
    geo['wheels'].append({'file': name + '.webp', 'left_pct': round(100 * box[0] / Wd, 3), 'top_pct': round(100 * box[1] / Hd, 3), 'size_pct_of_width': round(100 * disc.width / Wd, 3), 'r_tyre_px': round(w['r_tyre'], 1)})
canvas.save(f'{OUT}/etaxi-side.png')
canvas.save(f'{OUT}/etaxi-side.webp', quality=88, method=6)
json.dump(geo, open(f'{OUT}/etaxi-side.geo.json', 'w'), indent=1)
print(json.dumps(geo))
cw, ch = Wd + 500, Hd + 300
c = Image.new('RGB', (cw, ch), (255, 255, 255))
gy = 120 + wheels[0]['bottom']
ImageDraw.Draw(c).rectangle([0, gy, cw, ch], fill=(11, 18, 32))
c.paste(canvas, (380, 120), canvas)
for i, w in enumerate(wheels):
    dsc = Image.open(f"{OUT}/{['wheel-front', 'wheel-rear'][i]}.webp").convert('RGBA').rotate(33, resample=Image.BICUBIC)
    c.paste(dsc, (380 + int(w['cx'] - dsc.width / 2), 120 + int(w['cy'] - dsc.height / 2)), dsc)
c.resize((cw * 4 // 9, ch * 4 // 9), Image.LANCZOS).save(f'{OUT}/preview-etaxi.jpg', quality=88)
z = canvas.crop((int(Wd * 0.1), 0, int(Wd * 0.72), int(Hd * 0.78)))
zz = Image.new('RGB', z.size, (255, 255, 255)); zz.paste(z, (0, 0), z)
zz.resize((z.width * 2 // 3, z.height * 2 // 3), Image.LANCZOS).save(f'{OUT}/preview-etaxi-zoom.jpg', quality=85)
