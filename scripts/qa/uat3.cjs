const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')
const fs = require('fs')
const { execFileSync } = require('child_process')
const BASE = 'http://localhost:4312'
const SCR = 'C:/Users/DELL/AppData/Local/Temp/claude/C--Users-DELL-Desktop-projects/7a488da1-0d68-4995-98a8-277f2bc29161/scratchpad'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (k, v) => console.log('## ' + k + '\n' + (typeof v === 'string' ? v : JSON.stringify(v)))
async function sec(name, fn) { try { log(name, await fn()) } catch (e) { log(name, 'ERR ' + String(e.message).slice(0, 240)) } }
async function launch() { for (const o of [{}, { channel: 'msedge' }, { channel: 'chrome' }]) { try { return await chromium.launch({ headless: true, ...o }) } catch (e) {} } throw new Error('no browser') }
const jobs = []
const fgsOf = (p, sel) => p.evaluate((sel) => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true })
  const parse = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], +(d[3] / 255).toFixed(2)] }
  const root = document.querySelector(sel); if (!root) return null
  const opOf = (e) => { let o = 1; for (let x = e; x; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity); return +o.toFixed(2) }
  return [root, ...root.querySelectorAll('*')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => ({ t: e.textContent.trim().slice(0, 16), fs: parseFloat(getComputedStyle(e).fontSize), c: parse(getComputedStyle(e).color), op: opOf(e) }))
}, sel)
async function shoot(p, sel, file, pad = 3) {
  const box = await p.evaluate((sel) => { const el = document.querySelector(sel); const rg = document.createRange(); rg.selectNodeContents(el); const b = rg.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, vh: innerHeight, vw: innerWidth } }, sel)
  const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad)
  const clip = { x, y, width: Math.min(box.vw - x, box.w + 2 * pad), height: Math.min(box.vh - y, box.h + 2 * pad) }
  if (clip.width < 2 || clip.height < 2) return { err: 'off-screen', box }
  const h = await p.addStyleTag({ content: '*{color:transparent !important;-webkit-text-fill-color:transparent !important;text-shadow:none !important}' })
  await sleep(150)
  await p.screenshot({ path: file, clip })
  await h.evaluate((e) => e.remove())
  return { clip: [Math.round(clip.x), Math.round(clip.y), Math.round(clip.width), Math.round(clip.height)] }
}
const PY = String.raw`
import json
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
for j in json.load(open(S+'/jobs3.json')):
    try: im=Image.open(j['file']).convert('RGB')
    except Exception as e:
        print(j['name'],'NOIMG',e); continue
    px=sorted(list(im.getdata()),key=lum); n=len(px)
    med=px[n//2]; lo=px[int(n*0.02)]; hi=px[min(n-1,int(n*0.98))]
    print(j['name'],'bg median',med,'p2',lo,'p98',hi)
    seen=set()
    for g in j['fgs'] or []:
        a=g['c'][3]*g['op']; fg=[g['c'][i]*a+med[i]*(1-a) for i in range(3)]
        key=(tuple(round(x) for x in fg),g['fs'])
        if key in seen: continue
        seen.add(key)
        print('   ',repr(g['t']),'fs',g['fs'],'fg',[round(x) for x in fg],'op',g['op'],'ratio_med',round(ratio(fg,med),2),'worst',round(min(ratio(fg,lo),ratio(fg,hi)),2))
fr=[Image.open(S+'/seam-%d.png'%v).convert('RGB').resize((480,245)) for v in (50,110,170,230,300,380)]
sheet=Image.new('RGB',(1440,490))
for i,x in enumerate(fr): sheet.paste(x,((i%3)*480,(i//3)*245))
sheet.save('C:/Users/DELL/Desktop/projects/etaxi/docs/shots/uat-1440-seam.jpg',quality=82)
print('seam strip saved')
`
;(async () => {
  const b = await launch()
  const mk = async (w, h, o = {}) => { const ctx = await b.newContext({ viewport: { width: w, height: h }, ...o }); return { ctx, p: await ctx.newPage() } }
  const scrollF = (p, f) => p.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f)

  await sec('seam', async () => {
    const { ctx, p } = await mk(1440, 900); await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(3000)
    for (const v of [50, 110, 170, 230, 300, 380]) { await p.evaluate((v) => scrollTo(0, v), v); await sleep(900); await p.screenshot({ path: `${SCR}/seam-${v}.png`, clip: { x: 250, y: 250, width: 940, height: 480 } }) }
    await ctx.close(); return '6 frames'
  })

  await sec('signCollide', async () => {
    const R = {}
    for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
      const { ctx, p } = await mk(w, h); await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(1500)
      const hits = []
      for (let f = 0.16; f <= 0.75; f += 0.03) {
        await scrollF(p, f); await sleep(500)
        const r = await p.evaluate(() => {
          const eff = (e) => { let o = 1; for (let x = e; x && x !== document.documentElement; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity); return o }
          const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth && eff(e) > 0.2 && getComputedStyle(e).visibility !== 'hidden' }
          const signs = [...document.querySelectorAll('[data-sign]')].filter(vis)
          const texts = [...document.querySelectorAll('[data-road-copy] *, [data-stops] *')].filter((e) => !e.closest('[data-sign]') && !e.closest('[inert]') && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && vis(e))
          const out = []
          for (const s of signs) { const sb = s.getBoundingClientRect(); for (const t of texts) { const rg = document.createRange(); rg.selectNodeContents(t); const tb = rg.getBoundingClientRect(); const ix = Math.min(sb.right, tb.right) - Math.max(sb.left, tb.left), iy = Math.min(sb.bottom, tb.bottom) - Math.max(sb.top, tb.top); if (ix > 1 && iy > 1) out.push({ sign: s.textContent.trim().slice(0, 14), text: t.textContent.trim().slice(0, 24), ix: Math.round(ix), iy: Math.round(iy), signBox: [Math.round(sb.left), Math.round(sb.top), Math.round(sb.right), Math.round(sb.bottom)] }) } }
          return { n: signs.length, out }
        })
        if (r.out.length) hits.push({ f: +f.toFixed(2), ...r })
      }
      R[w] = hits.length ? hits.map((x) => JSON.stringify(x)) : 'no overlaps'
      await ctx.close()
    }
    return R
  })

  await sec('arrival', async () => {
    const R = []
    for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
      const { ctx, p } = await mk(w, h); await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(1500)
      const good = []
      for (let f = 0.7; f <= 0.97; f += 0.01) {
        await scrollF(p, f); await sleep(380)
        const ok = await p.evaluate(() => { const t = document.querySelector('.arrival__title'); const c = document.querySelector('[data-arrival-copy]'); let o = 1; for (let x = t; x && x !== document.documentElement; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity); const b = c.getBoundingClientRect(); return { o: +o.toFixed(2), inV: b.top >= 0 && b.bottom <= innerHeight, top: Math.round(b.top), bottom: Math.round(b.bottom), sc: getComputedStyle(document.querySelector('[data-arrival-picture]')).transform.slice(7, 13) } })
        if (ok.o >= 0.99 && ok.inV) good.push({ f: +f.toFixed(2), ...ok })
      }
      const info = { w, dwellSteps: good.length, first: good[0], last: good[good.length - 1] }
      if (good.length) {
        const mid = good[Math.floor(good.length / 2)]
        await scrollF(p, mid.f); await sleep(1500)
        const fgs = await fgsOf(p, '[data-arrival-copy]'); const file = `${SCR}/arrival3-${w}.png`
        info.shot = await shoot(p, '[data-arrival-copy]', file, 8)
        jobs.push({ name: 'arrivalCopy@' + w + ' f=' + mid.f, file, fgs })
      }
      R.push(JSON.stringify(info)); await ctx.close()
    }
    return R
  })
  fs.writeFileSync(SCR + '/jobs3.json', JSON.stringify(jobs))
  fs.writeFileSync(SCR + '/px3.py', PY)
  await b.close()
  try { console.log('## pixelContrast\n' + execFileSync('python', ['-W', 'ignore', '-I', SCR + '/px3.py'], { encoding: 'utf8' })) } catch (e) { console.log('PY ERR', String(e.stderr || e.message).slice(0, 600)) }
})().catch((e) => { console.log('FATAL', e); process.exit(1) })
