const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')
const { execFileSync } = require('child_process')
const BASE = 'http://localhost:4312'
const SCR = 'C:/Users/DELL/AppData/Local/Temp/claude/C--Users-DELL-Desktop-projects/7a488da1-0d68-4995-98a8-277f2bc29161/scratchpad'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const PY = String.raw`
from PIL import Image
S='${SCR}'
def lum(c):
    def f(v):
        v/=255
        return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])
def ratio(a,b):
    la,lb=lum(a),lum(b)
    return (max(la,lb)+0.05)/(min(la,lb)+0.05)
im=Image.open(S+'/arrival3-1440.png').convert('RGB'); W,H=im.size
print('img',W,H)
for name,fg,(y0,y1) in (('h2',(11,18,32),(0,int(H*0.66))),('sub',(49,59,75),(int(H*0.74),H))):
    c=im.crop((int(W*0.33),y0,int(W*0.67),y1))
    px=sorted(list(c.getdata()),key=lum); n=len(px)
    med=px[n//2]; lo=px[int(n*0.02)]; hi=px[int(n*0.98)]
    print(name,'central crop bg median',med,'p2',lo,'p98',hi,'ratio_med',round(ratio(fg,med),2),'worst',round(min(ratio(fg,lo),ratio(fg,hi)),2))
`
;(async () => {
  let b
  for (const o of [{}, { channel: 'msedge' }, { channel: 'chrome' }]) { try { b = await chromium.launch({ headless: true, ...o }); break } catch (e) {} }
  const R = {}
  for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage()
    await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(1500)
    const hits = []
    for (let f = 0.16; f <= 0.8; f += 0.02) {
      await p.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f); await sleep(450)
      const r = await p.evaluate(() => {
        const eff = (e) => { let o = 1; for (let x = e; x && x !== document.documentElement; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity); return o }
        const out = []; let n = 0
        for (const s of document.querySelectorAll('[data-sign]')) {
          const b = s.getBoundingClientRect()
          if (!(b.width > 0 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth && eff(s) > 0.2)) continue
          n++
          const y = Math.min(innerHeight - 1, Math.max(1, b.top + b.height / 2))
          for (const x of [b.left + 4, b.left + b.width / 2, b.right - 4]) {
            if (x < 0 || x >= innerWidth) continue
            const el = document.elementFromPoint(x, y)
            if (el && !s.contains(el)) out.push({ sign: s.textContent.trim().slice(0, 14), at: Math.round(x), top: (el.tagName + '.' + String(el.className).slice(0, 26)), txt: el.textContent.trim().slice(0, 18), signBox: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] })
          }
        }
        return { n, out }
      })
      if (r.out.length) hits.push(JSON.stringify({ f: +f.toFixed(2), ...r }))
    }
    R[w] = hits.length ? hits : 'no occlusion'
    await ctx.close()
  }
  console.log('## occlusion\n' + JSON.stringify(R))
  await b.close()
  require('fs').writeFileSync(SCR + '/px4.py', PY)
  try { console.log('## arrival 1440 central crop\n' + execFileSync('python', ['-W', 'ignore', '-I', SCR + '/px4.py'], { encoding: 'utf8' })) } catch (e) { console.log('PY ERR', String(e.stderr || e.message).slice(0, 500)) }
})()
