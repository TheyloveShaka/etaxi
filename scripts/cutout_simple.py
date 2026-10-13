import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, out, long_side = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32) / 255.0
H, W, _ = a.shape
ring = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
bg = np.median(ring, axis=0)
chroma = lambda x: x / (x.sum(axis=-1, keepdims=True) + 1e-6)
d = np.linalg.norm(chroma(a) - chroma(bg[None, None, :]), axis=-1) * 3.0
soft_alpha = np.clip((d - 0.16) / 0.12, 0, 1)
bglike = Image.fromarray(((soft_alpha < 0.999) * 255).astype(np.uint8), 'L')
pad = Image.new('L', (W + 2, H + 2), 255); pad.paste(bglike, (1, 1))
ImageDraw.floodfill(pad, (0, 0), 128)
outside = np.asarray(pad)[1:-1, 1:-1] == 128
alpha = np.where(outside, soft_alpha, 1.0)
rgb = a.copy()
m = np.clip(np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1], 0, 1)
rgb[..., 0] -= m; rgb[..., 2] -= m
img = Image.fromarray((np.dstack([np.clip(rgb, 0, 1), alpha]) * 255).astype(np.uint8), 'RGBA')
al = img.getchannel('A')
mk = al.point(lambda v: 255 if v > 150 else 0)
p2 = Image.new('L', (W + 2, H + 2), 0); p2.paste(mk, (1, 1))
ImageDraw.floodfill(p2, (W // 2, H // 2), 128)
main = p2.crop((1, 1, W + 1, H + 1)).point(lambda v: 255 if v == 128 else 0).filter(ImageFilter.MaxFilter(3))
al = Image.composite(al, Image.new('L', al.size, 0), main).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
img.putalpha(al)
img = img.crop(img.getchannel('A').point(lambda v: 255 if v > 30 else 0).getbbox())
s = long_side / max(img.size)
img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
img.save(out, quality=90, method=6)
print(out, img.size)
