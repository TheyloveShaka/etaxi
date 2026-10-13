import json
import re
import sys

import pymupdf

doc = pymupdf.open(sys.argv[1])
items = json.load(open(sys.argv[2], encoding='utf-8'))


def norm(text):
    return re.sub(r'\s+', ' ', text).strip().lower()


texts = [norm(p.get_text()) for p in doc]
probe = [norm(x['title']) for x in items[:3]]
toc_pages = [i for i, t in enumerate(texts) if all(k in t for k in probe)]
start = (max(toc_pages) if toc_pages else 0) + 1
out = {}
for it in items:
    full = norm(it['label'] + ' ' + it['title'])
    short = norm(it['title'])
    page = next((i + 1 for i in range(start, len(texts)) if full in texts[i]), None)
    if page is None:
        page = next((i + 1 for i in range(start, len(texts)) if short in texts[i]), None)
    out[it['href']] = page
print(json.dumps(out))
