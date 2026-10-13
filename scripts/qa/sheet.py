import sys, glob
from PIL import Image

tag, cols, cell_w = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 4, int(sys.argv[3]) if len(sys.argv) > 3 else 440
files = sorted(glob.glob(f'docs/shots/{tag}-[0-9][0-9].png'))
ims = [Image.open(f).convert('RGB') for f in files]
ch = round(cell_w * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cell_w + (cols - 1) * 8, rows * ch + (rows - 1) * 8), (200, 60, 60))
for i, im in enumerate(ims):
    sheet.paste(im.resize((cell_w, ch), Image.LANCZOS), ((i % cols) * (cell_w + 8), (i // cols) * (ch + 8)))
sheet.save(f'docs/shots/{tag}-sheet.jpg', quality=80)
print(f'docs/shots/{tag}-sheet.jpg', sheet.size, len(ims), 'frames')
