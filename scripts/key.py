import sys, numpy as np
from PIL import Image

def key_out(path, out, tol=0.16, soft=0.10, trim=2):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255.0
    h, w, _ = a.shape
    # background colour = median of a border ring
    ring = np.concatenate([
        a[:6].reshape(-1,3), a[-6:].reshape(-1,3),
        a[:, :6].reshape(-1,3), a[:, -6:].reshape(-1,3)])
    bg = np.median(ring, axis=0)

    # chromaticity distance: normalise out brightness so soft shadows on the
    # backdrop (same hue, lower value) still read as background
    def chroma(x):
        s = x.sum(axis=-1, keepdims=True) + 1e-6
        return x / s
    d_chroma = np.linalg.norm(chroma(a) - chroma(bg[None,None,:]), axis=-1)
    d_rgb    = np.linalg.norm(a - bg[None,None,:], axis=-1)

    # a pixel is background if its hue matches AND it is not much brighter/darker
    val   = a.sum(axis=-1) / 3.0
    bgval = float(bg.sum() / 3.0)
    darker = np.clip((bgval - val) / max(bgval, 1e-6), 0, 1)   # shadow depth
    # Key on chromaticity only. A cast shadow shares the backdrop's hue and
    # differs solely in brightness, so a brightness term would keep it; a real
    # subject (including neutral whites and creams) differs in hue. d_rgb is
    # allowed to contribute only where the hue already disagrees.
    d = d_chroma * 3.0
    d = np.maximum(d, np.where(d_chroma > 0.05, d_rgb * 0.30, 0.0))

    alpha = np.clip((d - tol) / soft, 0, 1)

    # keep only the largest connected blob, kill speckle
    try:
        from scipy import ndimage
        lab, n = ndimage.label(alpha > 0.5)
        if n > 1:
            sizes = ndimage.sum(alpha > 0.5, lab, range(1, n+1))
            keep = int(np.argmax(sizes)) + 1
            alpha[(lab != keep) & (lab != 0)] = 0
    except ImportError:
        pass

    # despill: pull colour away from the backdrop hue at soft edges
    spill = (1.0 - alpha)[..., None] * (bg[None,None,:] - a)
    rgb = np.clip(a - spill * 0.85, 0, 1)

    # erode a hair so no fringe survives
    if trim:
        from PIL import ImageFilter
        am = Image.fromarray((alpha*255).astype(np.uint8)).filter(ImageFilter.MinFilter(trim*2+1))
        alpha = np.asarray(am).astype(np.float32)/255.0

    rgba = np.dstack([rgb, alpha])
    Image.fromarray((rgba*255).astype(np.uint8), 'RGBA').save(out)
    cov = float((alpha > 0.5).mean())
    print(f"  {out}  bg={tuple((bg*255).astype(int))}  subject={cov*100:.1f}% of frame")
    return cov

if __name__ == '__main__':
    key_out(sys.argv[1], sys.argv[2])
