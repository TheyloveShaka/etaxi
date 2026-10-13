import sys, json, base64, re, urllib.request, pathlib

ENV = pathlib.Path('C:/Users/DELL/Desktop/projects/Money makers/gig economy/.env')
MODEL = 'google/gemini-2.5-flash-image'

def main():
    out, aspect, prompt_file, *refs = sys.argv[1:]
    key = re.search(r'^OPENROUTER_API_KEY\s*=\s*["\']?([^"\'\r\n]+)', ENV.read_text(encoding='utf-8'), re.M).group(1).strip()
    content = [{'type': 'text', 'text': pathlib.Path(prompt_file).read_text(encoding='utf-8')}]
    for r in refs:
        mime = 'image/png' if r.lower().endswith('.png') else 'image/jpeg'
        b64 = base64.b64encode(pathlib.Path(r).read_bytes()).decode()
        content.append({'type': 'image_url', 'image_url': {'url': f'data:{mime};base64,{b64}'}})
    body = json.dumps({'model': MODEL, 'modalities': ['image', 'text'],
                       'image_config': {'aspect_ratio': aspect},
                       'usage': {'include': True},
                       'messages': [{'role': 'user', 'content': content}]}).encode()
    req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions', data=body,
                                 headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    d = json.load(urllib.request.urlopen(req, timeout=180))
    msg = d['choices'][0]['message']
    imgs = msg.get('images') or []
    if not imgs:
        print('NO IMAGE', (msg.get('content') or '')[:300]); sys.exit(1)
    pathlib.Path(out).write_bytes(base64.b64decode(imgs[0]['image_url']['url'].split(',', 1)[1]))
    u = d.get('usage', {})
    print('saved', out, 'cost', u.get('cost'), 'in', u.get('prompt_tokens'), 'out', u.get('completion_tokens'))

main()
