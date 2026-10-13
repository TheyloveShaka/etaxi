import html
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'proposal'
HEAD = """<!doctype html>
<html lang="en-UG">
<head>
<meta charset="utf-8">
<title>{title}</title>
<link rel="stylesheet" href="print.css">
</head>
<body>
"""
CITE = re.compile(r'<cite data-u="([^"]+)" data-t="([^"]*)"\s*>\s*</cite>')
SEC = re.compile(r'<section class="sec[^"]*" id="([^"]+)">\s*<h1><span class="num">([^<]+)</span>(.*?)</h1>', re.S)


def assemble(title, body):
    order, titles = [], {}

    def number(match):
        url, label = match.group(1), match.group(2)
        if url not in titles:
            order.append(url)
            titles[url] = label
        return f'<sup class="ref">[{order.index(url) + 1}]</sup>'

    body = CITE.sub(number, body)
    stray = len(re.findall(r'<cite\b', body))
    toc = ['<ol class="toc">']
    for sid, label, name in SEC.findall(body):
        mark = label.split()[-1]
        toc.append(f'<li><a href="#{sid}"><span class="n">{html.escape(mark)}</span><span class="t">{re.sub(r"<[^>]+>", "", name).strip()}</span></a></li>')
    toc.append('</ol>')
    body = body.replace('<!--TOC-->', '\n'.join(toc))
    src = ['<ol class="sources">']
    for url in order:
        src.append(f'<li>{titles[url]}. <a href="{html.escape(url)}">{html.escape(url)}</a></li>')
    src.append('</ol>')
    body = body.replace('<!--SOURCES-->', '\n'.join(src))
    text = re.sub(r'<[^>]+>', ' ', body)
    return HEAD.format(title=title) + body + '\n</body>\n</html>\n', {
        'sources': len(order), 'stray_cites': stray, 'words': len(text.split()),
        'dashes': len(re.findall('[—–]', body)), 'sections': len(SEC.findall(body)),
    }


jobs = []
parts = sorted((ROOT / 'parts').glob('*.html')) if (ROOT / 'parts').exists() else []
if parts:
    jobs.append(('detailed.html', 'eTaxi concept proposal', '\n'.join(p.read_text(encoding='utf-8') for p in parts)))
summary = ROOT / 'summary-body.html'
if summary.exists():
    jobs.append(('summary.html', 'eTaxi executive summary', summary.read_text(encoding='utf-8')))
if not jobs:
    sys.exit('no proposal parts found')
for name, title, body in jobs:
    out, stats = assemble(title, body)
    (ROOT / name).write_text(out, encoding='utf-8', newline='\n')
    print(name, stats)
