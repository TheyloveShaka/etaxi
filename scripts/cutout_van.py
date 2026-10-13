import sys, json, numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, out_dir = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32) / 255.0
H, W, _ = a.shape
ring = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
bg = np.median(ring, axis=0)
chroma = lambda x: x / (x.sum(axis=-1, keepdims=True) + 1e-6)
d = np.linalg.norm(chroma(a) - chroma(bg[None, None, :]), axis=-1) * 3.0
tol, soft = 0.16, 0.12
soft_alpha = np.clip((d - tol) / soft, 0, 1)

bglike = Image.fromarray(((soft_alpha < 0.999) * 255).astype(np.uint8), 'L')
pad = Image.new('L', (W + 2, H + 2), 255); pad.paste(bglike, (1, 1))
ImageDraw.floodfill(pad, (0, 0), 128)
outside = np.asarray(pad)[1:-1, 1:-1] == 128
alpha = np.where(outside, soft_alpha, 1.0)

rgb = a.copy()
m = np.clip(np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1], 0, 1)
lum = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])
rgb[..., 0] -= m; rgb[..., 2] -= m
ink = np.array([0.043, 0.071, 0.125]); glass_hi = np.array([0.30, 0.44, 0.60])
t = np.clip((lum - 0.05) / 0.55, 0, 1)[..., None]
glass = ink + t * (glass_hi - ink)
w = (np.clip(m / 0.18, 0, 1) * (~outside))[..., None]
rgb = rgb * (1 - w) + glass * w

cov = (alpha > 0.5).sum(axis=1)
roof_y = int(np.argmax(cov > 0.45 * cov.max()))
alpha[:roof_y] = 0
ys, xs = np.where(alpha > 0.5)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()

blue = (a[..., 2] > 0.6) & (a[..., 0] < 0.35) & (a[..., 1] > 0.4) & (a[..., 1] < 0.8) & (alpha > 0.9)
by, bx = np.where(blue)
band_y0, band_y1 = int(np.percentile(by, 2)), int(np.percentile(by, 98))
cols = blue[band_y0:band_y1].sum(axis=0) > 0.6 * (band_y1 - band_y0)
runs, start = [], None
for x in range(W):
    if cols[x] and start is None: start = x
    if not cols[x] and start is not None: runs.append((start, x - 1)); start = None
runs = [r for r in runs if r[1] - r[0] > 8]
sq_w = int(np.median([r[1] - r[0] + 1 for r in runs]))
pitch = float(np.median(np.diff([r[0] for r in runs])))
sq_col = np.median(rgb[band_y0 + 3:band_y1 - 3, runs[0][0] + 3:runs[0][1] - 3].reshape(-1, 3), axis=0)
info = {'roof_y': roof_y, 'band': [band_y0, band_y1], 'sq_w': sq_w, 'pitch': pitch, 'first_sq_x': runs[0][0], 'n_sq': len(runs)}

added = []
if len(sys.argv) > 3:
    for k in [int(v) for v in sys.argv[3].split(',')]:
        sx = int(round(runs[0][0] - k * pitch))
        rgb[band_y0:band_y1 + 1, sx:sx + sq_w] = sq_col
        added.append(sx)
info['added_sq_x'] = added

rgba = np.dstack([np.clip(rgb, 0, 1), alpha])
full = Image.fromarray((rgba * 255).astype(np.uint8), 'RGBA')
a8 = full.getchannel('A').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
full.putalpha(a8)
padpx = 4
box = (x0 - padpx, roof_y - padpx, x1 + padpx + 1, y1 + padpx + 1)
van = full.crop(box)
van.save(f'{out_dir}/van-side.png')
van.save(f'{out_dir}/van-side.webp', quality=92, method=6)
vw, vh = van.size

dark = (lum < 0.22) & (alpha > 0.9)
bot = dark[y1 - 12:y1 - 4].sum(axis=0) > 3
wr, start = [], None
for x in range(W):
    if bot[x] and start is None: start = x
    if not bot[x] and start is not None: wr.append((start, x - 1)); start = None
wr = [r for r in wr if r[1] - r[0] > 20]
wheels = []
for (s, e) in wr:
    cx = (s + e) / 2
    col = dark[:, int(cx)]
    y = y1
    while y > 0 and not col[y]: y -= 1
    bottom = y
    r = None
    for rr in range(30, 140):
        cy = bottom - rr
        if not dark[int(cy), int(cx - rr + 3)] :
            continue
        r = rr
    wheels.append({'cx': cx, 'bottom': bottom, 'r_guess': r, 'run': [s, e]})
info['wheels_raw'] = wheels
info['crop_box'] = [int(v) for v in box]; info['van_size'] = [vw, vh]
json.dump(info, open(f'{out_dir}/van-side.json', 'w'), indent=1, default=float)
print(json.dumps(info, default=float))

def comp(bgcol, name, band=None):
    cw, ch = vw + 400, vh + 260
    c = Image.new('RGB', (cw, ch), bgcol)
    if band:
        ImageDraw.Draw(c).rectangle([0, 130 + vh - 6, cw, ch], fill=band)
    c.paste(van, (300, 130), van)
    c.resize((cw * 2 // 3, ch * 2 // 3), Image.LANCZOS).save(f'{out_dir}/{name}', quality=85)
comp((255, 255, 255), 'preview-van-white.jpg', (11, 18, 32))
z = van.crop((0, 0, 420, 330)).resize((840, 660), Image.LANCZOS)
c = Image.new('RGB', z.size, (255, 255, 255)); c.paste(z, (0, 0), z); c.save(f'{out_dir}/preview-van-zoom.jpg', quality=85)
