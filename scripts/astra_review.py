import json, base64, re, io, urllib.request, pathlib
from PIL import Image

ENV = pathlib.Path('C:/Users/DELL/Desktop/projects/Money makers/gig economy/.env')
key = re.search(r'^OPENROUTER_API_KEY\s*=\s*["\']?([^"\'\r\n]+)', ENV.read_text(encoding='utf-8'), re.M).group(1).strip()

def img(path, w):
    im = Image.open(path).convert('RGB')
    if im.width > w: im = im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=82)
    return {'type': 'image_url', 'image_url': {'url': 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()}}

prompt = """You are a senior art director doing a single adversarial review of a website build against its reference. No praise. Be specific and concrete.

IMAGE 1: contact sheet of the REFERENCE (a freight company site), frames in scroll order, left to right, top to bottom. Its moves: stark white field with a black ground band and a side-on vehicle; the band becomes a road and the vehicle is seen from above; a rounded junction with a big zoom-out; the vehicle pinned on a narrow vertical road with a pinned headline on one side and features on the other; the road runs into a full-bleed photo that rises over it.
IMAGE 2: contact sheet of OUR BUILD at 1440x900, frames in scroll order.
IMAGE 3: contact sheet of OUR BUILD at 375x812, frames in scroll order.

OUR BRIEF: a one-page pitch site for "eTaxi", electric 14-seater public taxis for Kampala, Uganda, plus a rider app. The client asked us to reproduce the reference's flow and its clean, solid-colour staging. Fixed and not up for debate: the concept, the copy, the fonts (Panchang for display, Switzer for text), the palette (white, taxi blue, ink black road, a touch of green), the generated interior photo, and the dash-band motif of blue squares.

Write, in under 520 words total:
A. The six most important places where our build falls short of the reference's finish or misses one of its moves. For each: the frame, what is weaker, and the exact fix (sizes, spacing, positions, weights; CSS-level where you can).
B. Three things that read as generic, template-like or AI-made.
C. Anything that looks broken, misaligned, clipped or unreadable in any frame, desktop or phone.
D. One thing to cut.
Rank by impact. Plain numbered lists. No preamble, no summary."""

body = json.dumps({'model': 'openai/gpt-6-astra', 'max_tokens': 7000, 'reasoning': {'effort': 'low'}, 'usage': {'include': True},
                   'messages': [{'role': 'user', 'content': [{'type': 'text', 'text': prompt}, img('refs/pin/sheet-12-22s.jpg', 1400), img('docs/shots/s-1440-sheet.jpg', 1500), img('docs/shots/s-375-sheet.jpg', 1200)]}]}).encode()
req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions', data=body, headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
try:
    d = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    print('HTTP', e.code, e.read().decode()[:600]); raise SystemExit(1)
ch = d['choices'][0]; u = d.get('usage', {})
text = ch['message'].get('content') or ''
pathlib.Path('docs/ASTRA-REVIEW.md').write_text('# Astra visual attack (single shot, 2026-10-13)\n\n' + text + '\n', encoding='utf-8', newline='\n')
print('finish', ch.get('finish_reason'), 'cost', u.get('cost'), 'in', u.get('prompt_tokens'), 'out', u.get('completion_tokens'))
print(text)
