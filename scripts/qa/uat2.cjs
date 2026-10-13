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
for j in json.load(open(S+'/jobs.json')):
    try: im=Image.open(j['file']).convert('RGB')
    except Exception as e:
        print(j['name'],'NOIMG',e); continue
    px=sorted(im.getdata(),key=lum); n=len(px)
    med=px[n//2]; lo=px[int(n*0.02)]; hi=px[min(n-1,int(n*0.98))]
    print(j['name'],'bg median',med,'p2',lo,'p98',hi)
    seen=set()
    for g in j['fgs'] or []:
        a=g['c'][3]*g['op']; fg=[g['c'][i]*a+med[i]*(1-a) for i in range(3)]
        key=(tuple(round(x) for x in fg),g['fs'])
        if key in seen: continue
        seen.add(key)
        print('   ',repr(g['t']),'fs',g['fs'],'fg',[round(x) for x in fg],'op',g['op'],'ratio_med',round(ratio(fg,med),2),'worst',round(min(ratio(fg,lo),ratio(fg,hi)),2))
im=[Image.open(S+'/turn-%s.png'%f).convert('RGB').resize((500,280)) for f in ('0.06','0.08','0.1','0.12')]
sheet=Image.new('RGB',(1000,560))
for i,x in enumerate(im): sheet.paste(x,((i%2)*500,(i//2)*280))
sheet.save('C:/Users/DELL/Desktop/projects/etaxi/docs/shots/uat-1440-turn.jpg',quality=82)
print('turn strip saved')
`
;(async () => {
  const b = await launch()
  const mk = async (w, h, o = {}) => { const ctx = await b.newContext({ viewport: { width: w, height: h }, ...o }); return { ctx, p: await ctx.newPage() } }
  const scrollF = (p, f) => p.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f)

  await sec('pixelFacts', async () => {
    const R = []
    for (const [w, h] of [[1440, 900], [1280, 720], [375, 812]]) {
      const { ctx, p } = await mk(w, h); await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(3500)
      const fgs = await fgsOf(p, '[data-facts]'); const file = `${SCR}/facts-${w}.png`
      const info = await shoot(p, '[data-facts]', file)
      jobs.push({ name: 'facts@' + w, file, fgs })
      R.push({ w, info, inner: await p.evaluate(() => document.querySelector('[data-facts]').innerText.replace(/\n/g, ' / ')), leafTextBottoms: await p.evaluate(() => [...document.querySelectorAll('[data-facts] *')].filter((e) => e.children.length === 0).map((e) => { const rg = document.createRange(); rg.selectNodeContents(e); return Math.round(rg.getBoundingClientRect().bottom) })), vh: h })
      await ctx.close()
    }
    return R
  })

  await sec('pixelArrival', async () => {
    const R = []
    for (const [w, h] of [[1440, 900], [375, 812]]) {
      const { ctx, p } = await mk(w, h); await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(1500)
      for (let i = 0; i < 4; i++) { await p.evaluate(() => { const el = document.querySelector('.arrival__title'); const b = el.getBoundingClientRect(); scrollTo(0, scrollY + b.top + b.height / 2 - innerHeight / 2) }); await sleep(900) }
      await sleep(2000)
      const fgs = await fgsOf(p, '.arrival__title'); const file = `${SCR}/arrival-${w}.png`
      const info = await shoot(p, '.arrival__title', file, 6)
      jobs.push({ name: 'arrival@' + w, file, fgs })
      R.push({ w, info, picScale: await p.evaluate(() => getComputedStyle(document.querySelector('[data-arrival-picture]')).transform + ' / img ' + getComputedStyle(document.querySelector('[data-arrival-picture] img')).transform), imgLoaded: await p.evaluate(() => { const i = document.querySelector('[data-arrival-picture] img'); return i.complete && i.naturalWidth + ' ' + i.currentSrc.split('/').pop() }) })
      await ctx.close()
    }
    return R
  })

  await sec('roadWords', async () => {
    const { ctx, p } = await mk(1440, 900); await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(1500)
    const R = []
    for (const f of [0.17, 0.2, 0.25, 0.3, 0.4, 0.55]) {
      await scrollF(p, f); await sleep(800)
      R.push(f + ': ' + (await p.evaluate(() => [...document.querySelectorAll('[data-road-word]')].map((e) => getComputedStyle(e).color.replace('rgb', '').replace(/ /g, '')).join(' '))))
      if (f === 0.2 || f === 0.3) { const fgs = await fgsOf(p, '[data-road-title]'); const file = `${SCR}/roadtitle-${f}.png`; const info = await shoot(p, '[data-road-title]', file); jobs.push({ name: 'roadtitle@' + f, file, fgs }); R.push(JSON.stringify(info)) }
    }
    await ctx.close(); return R
  })

  await sec('trailStops', async () => {
    const { ctx, p } = await mk(1440, 900); await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(1500)
    const R = []
    for (const f of [0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]) {
      await scrollF(p, f); await sleep(800)
      R.push(JSON.stringify(await p.evaluate((f) => {
        const t = document.querySelector('[data-trail]'); let tr = null
        if (t) { const bb = t.getBoundingClientRect(); const cs = getComputedStyle(t); tr = { tag: t.tagName, h: Math.round(bb.height), top: Math.round(bb.top), dash: cs.strokeDasharray, off: cs.strokeDashoffset, stroke: cs.stroke, bg: cs.backgroundColor, tf: cs.transform.slice(0, 36), len: t.getTotalLength ? Math.round(t.getTotalLength()) : null } }
        return { f, tr, stops: [...document.querySelectorAll('[data-stop]')].map((s) => { const cs = getComputedStyle(s); return (+cs.opacity).toFixed(2) + (cs.visibility === 'hidden' ? 'h' : '') }).join(' ') }
      }, f)))
    }
    await ctx.close(); return R
  })

  await sec('fontReq', async () => {
    const { ctx, p } = await mk(1440, 900); const reqs = [], msgs = []
    p.on('request', (r) => { if (/\/fonts\//.test(r.url())) reqs.push(r.url().split('/').pop() + ' ' + r.resourceType()) })
    p.on('console', (m) => msgs.push(m.type() + ':' + m.text().slice(0, 110)))
    await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(6500); await ctx.close()
    return { reqs, msgs }
  })

  await sec('tabsLong', async () => {
    const { ctx, p } = await mk(1440, 900); await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(1500)
    const R = []
    for (let i = 0; i < 9; i++) {
      await p.keyboard.press('Tab'); await sleep(i < 6 ? 250 : 3800)
      R.push(JSON.stringify(await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return { body: true }; const bb = e.getBoundingClientRect(); return { t: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 20), top: Math.round(bb.top), bottom: Math.round(bb.bottom), inView: bb.top >= 0 && bb.bottom <= innerHeight, y: Math.round(scrollY) } })))
    }
    await ctx.close(); return R
  })

  await sec('turn', async () => {
    const { ctx, p } = await mk(1440, 900); await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(2000)
    const files = []
    for (const f of [0.06, 0.08, 0.1, 0.12]) { await scrollF(p, f); await sleep(900); const file = `${SCR}/turn-${f}.png`; await p.screenshot({ path: file, clip: { x: 200, y: 200, width: 1000, height: 560 } }); files.push(file) }
    await ctx.close(); return files.length + ' frames'
  })
  fs.writeFileSync(SCR + '/jobs.json', JSON.stringify(jobs))
  fs.writeFileSync(SCR + '/px.py', PY)
  await b.close()
  try { console.log('## pixelContrast\n' + execFileSync('python', ['-I', SCR + '/px.py'], { encoding: 'utf8' })) } catch (e) { console.log('PY ERR', String(e.stderr || e.message).slice(0, 600)) }
})().catch((e) => { console.log('FATAL', e); process.exit(1) })
