import sys
import fitz
from PIL import Image

pdf, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
cell = int(sys.argv[4]) if len(sys.argv) > 4 else 380
first = int(sys.argv[5]) if len(sys.argv) > 5 else 1
last = int(sys.argv[6]) if len(sys.argv) > 6 else 10 ** 6

doc = fitz.open(pdf)
pages = [p for i, p in enumerate(doc, 1) if first <= i <= last]
ims = []
for p in pages:
    z = cell / p.rect.width
    pm = p.get_pixmap(matrix=fitz.Matrix(z, z))
    ims.append(Image.frombytes('RGB', (pm.width, pm.height), pm.samples))
h = ims[0].height
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cell + (cols - 1) * 6, rows * h + (rows - 1) * 6), (120, 130, 145))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * (cell + 6), (i // cols) * (h + 6)))
sheet.save(out, quality=82)
print(out, sheet.size, 'pages', len(doc))
