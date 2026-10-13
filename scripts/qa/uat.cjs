const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')
const BASE = process.argv[2] || 'http://localhost:4312'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = {}
const log = (k, v) => console.log('## ' + k + '\n' + (typeof v === 'string' ? v : JSON.stringify(v)))

async function launch() {
  for (const o of [{}, { channel: 'msedge' }, { channel: 'chrome' }]) {
    try { return await chromium.launch({ headless: true, ...o }) } catch (e) {}
  }
  throw new Error('no browser')
}
async function sec(name, fn) {
  try { const v = await fn(); out[name] = v; log(name, v) } catch (e) { log(name, 'ERR ' + String(e.message).slice(0, 240)) }
}

const PLAN = [
  'Electric public taxis for Kampala', 'The taxi you know. Now electric.',
  'The blue and white you flag down every day, without the smoke. Open the app and watch yours come to you.',
  'Get updates', 'See how it works', 'Concept. No eTaxis are running yet.', 'exhaust fumes', 'seats', 'Fare shown before you board',
  'Every stage, sorted.', 'See it coming.', 'Every eTaxi on your route shows on the beacon. Walk to the stage when it is two minutes out, not twenty.',
  'Masaawo.', "No shouting from the back seat. Tap Masaawo and your stop lands on the driver's dash.", 'Know the fare first.',
  'The app works out your fare before you board. Pay with mobile money and skip the change argument.', 'Cameras on board.',
  'Cameras and live tracking in every eTaxi, and a link you can send home so someone sees you arrive.', 'Door to door.',
  'In a hurry, or carrying shopping? Pay a little extra and the eTaxi picks you up and drops you at the gate.', 'Nothing out the back.',
  'Battery powered. Quiet on Kira Road, cleaner air for everyone walking beside it.', 'Sit back. Kampala just got quieter.',
  'eTaxi is a concept for electric public taxis in Kampala.', '2026', 'Ntinda', 'Kamwokya', 'Wandegeya', 'City Square',
  'Example fare', 'UGX 2,000', 'Updates open soon', "I'm on board", '2 min', 'eTaxi 07', '600 m', 'Pay with mobile money', 'Stopping at Kamwokya',
]
const norm = (s) => s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ')

const stOf = (p) => p.evaluate(() => {
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2), Math.round(b.width), Math.round(b.height)] }
  const d = document.documentElement
  return { y: Math.round(scrollY), h: d.scrollHeight, frac: +(scrollY / Math.max(1, d.scrollHeight - innerHeight)).toFixed(3), active: document.querySelector('[data-journey-view]')?.dataset.activeStage, top: r(document.querySelector('[data-van-top]')), side: r(document.querySelector('[data-van-body]')), ov: d.scrollWidth > d.clientWidth, iw: innerWidth }
})

;(async () => {
  const b = await launch()
  const consoleErrs = []
  const mk = async (w, h, opts = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, ...opts })
    const p = await ctx.newPage()
    p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleErrs.push(w + ': ' + m.type() + ': ' + m.text().slice(0, 140)) })
    p.on('pageerror', (e) => consoleErrs.push(w + ': pageerror: ' + e.message.slice(0, 140)))
    return { ctx, p }
  }

  const net = { hosts: new Set(), nonGet: [], bad: [], img: [] }
  let { ctx, p } = await mk(1440, 900)
  await ctx.addInitScript(() => {
    window.__lcp = []; window.__cls = 0
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), tag: e.element && e.element.tagName, url: e.url, cls: e.element && String(e.element.className).slice(0, 30), size: e.size }) }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
    } catch (e) {}
  })
  p.on('request', (r) => { net.hosts.add(new URL(r.url()).host); if (r.method() !== 'GET') net.nonGet.push(r.method() + ' ' + r.url()) })
  p.on('requestfailed', (r) => net.bad.push('FAILED ' + r.url()))
  p.on('response', async (r) => {
    if (r.status() >= 400) net.bad.push(r.status() + ' ' + r.url())
    if (/\.(webp|avif|jpg|jpeg|png|svg)(\?|$)/.test(r.url())) { try { const buf = await r.body(); net.img.push([r.url().replace(BASE, ''), buf.length]) } catch (e) {} }
  })
  await p.goto(BASE, { waitUntil: 'networkidle' })
  await sleep(1800)

  await sec('lcp_cls', () => p.evaluate(() => ({ lcp: window.__lcp.slice(-2), cls: +window.__cls.toFixed(4) })))

  await sec('dom', async () => {
    const d = await p.evaluate(() => {
      const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => h.tagName + ': ' + h.textContent.trim().replace(/\s+/g, ' ').slice(0, 50))
      const imgs = [...document.images].map((i) => ({ src: i.getAttribute('src'), alt: i.getAttribute('alt'), nw: i.naturalWidth, ok: i.complete, load: i.loading, w: i.getAttribute('width'), h: i.getAttribute('height') }))
      const landmarks = ['header', 'nav', 'main', 'footer', 'aside'].map((t) => t + ':' + document.querySelectorAll(t).length).join(' ')
      const links = [...document.querySelectorAll('a')].map((a) => ({ t: a.textContent.trim().replace(/\s+/g, ' ').slice(0, 30), href: a.getAttribute('href'), aria: a.getAttribute('aria-label'), tgt: a.target }))
      const buttons = [...document.querySelectorAll('button')].map((x) => ({ t: (x.getAttribute('aria-label') || x.textContent).trim().replace(/\s+/g, ' ').slice(0, 30), inert: !!x.closest('[inert]'), ah: !!x.closest('[aria-hidden="true"]'), cur: getComputedStyle(x).cursor, upd: x.hasAttribute('data-updates') }))
      const inertEls = [...document.querySelectorAll('[inert]')].map((e) => e.tagName + '.' + String(e.className).slice(0, 30))
      const focusAH = [...document.querySelectorAll('[aria-hidden="true"] a[href],[aria-hidden="true"] button,[aria-hidden="true"] [tabindex]:not([tabindex="-1"])')].filter((e) => !e.closest('[inert]')).map((e) => e.tagName + '.' + String(e.className).slice(0, 24))
      const ph = (document.documentElement.outerHTML.match(/lorem|ipsum|\btodo\b|\btbd\b|your company|example\.com|dummy|xxx/gi) || [])
      const hashOnly = [...document.querySelectorAll('a[href="#"],a:not([href])')].length
      const contact = [...document.querySelectorAll('a[href^="tel:"],a[href^="mailto:"],a[href*="wa.me"],a[href*="maps"]')].map((a) => a.href)
      const titles = [...document.querySelectorAll('[title]')].map((e) => e.getAttribute('title'))
      const ids = [...document.querySelectorAll('[id]')].map((e) => e.id)
      const dup = ids.filter((x, i) => ids.indexOf(x) !== i)
      const anchors = [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')).filter((h) => h.length > 1).map((h) => h + ':' + !!document.querySelector(h))
      const hr = document.querySelectorAll('hr').length
      const ld = (() => { try { const j = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent); return JSON.stringify(j).slice(0, 400) } catch (e) { return 'INVALID' } })()
      const head = { canonical: !!document.querySelector('link[rel=canonical]'), ogurl: !!document.querySelector('meta[property="og:url"]'), ogimg: document.querySelector('meta[property="og:image"]')?.content, ogalt: !!document.querySelector('meta[property="og:image:alt"]'), apple: !!document.querySelector('link[rel=apple-touch-icon]'), manifest: !!document.querySelector('link[rel=manifest]'), dlen: document.querySelector('meta[name=description]')?.content.length, tlen: document.title.length }
      const c = document.body.cloneNode(true); c.querySelectorAll('script,style,svg,noscript').forEach((e) => e.remove())
      const text = c.textContent.replace(/\s+/g, ' ').trim()
      const h3v = [...document.querySelectorAll('h3')].map((h) => { const cs = getComputedStyle(h); let hid = false; for (let e = h; e; e = e.parentElement) { if (e.getAttribute && e.getAttribute('aria-hidden') === 'true') { hid = true; break } } return h.textContent.trim().slice(0, 22) + ' | vis=' + cs.visibility + ' op=' + cs.opacity + ' ariaHidden=' + hid })
      const attrs = [...new Set([...document.querySelectorAll('*')].flatMap((e) => e.getAttributeNames().filter((n) => n.startsWith('data-'))))].join(' ')
      return { headings, imgs, landmarks, links, buttons, inertEls, focusAH, ph, hashOnly, contact, titles, dup, anchors, hr, ld, head, text, h3v, attrs }
    })
    const og = await p.evaluate(async () => { try { const bm = await createImageBitmap(await (await fetch('/og.jpg')).blob()); return bm.width + 'x' + bm.height } catch (e) { return 'ERR' } })
    const missing = PLAN.filter((s) => !norm(d.text).includes(norm(s)))
    return { ...d, og, missing, text: d.text }
  })

  await sec('tabs', async () => {
    await p.evaluate(() => { window.scrollTo(0, 0); if (document.activeElement) document.activeElement.blur() })
    const rows = []; let first = null
    for (let i = 0; i < 24; i++) {
      await p.keyboard.press('Tab'); await sleep(140)
      const r = await p.evaluate(() => {
        const e = document.activeElement
        if (!e || e === document.body) return { body: true }
        const b = e.getBoundingClientRect(); const cs = getComputedStyle(e)
        return { tag: e.tagName, t: (e.getAttribute('aria-label') || e.textContent).trim().replace(/\s+/g, ' ').slice(0, 24), cls: String(e.className).slice(0, 18), inView: b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth, w: Math.round(b.width), h: Math.round(b.height), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor : 'none', shadow: cs.boxShadow !== 'none' ? cs.boxShadow.slice(0, 40) : 'none', fv: e.matches(':focus-visible'), y: Math.round(scrollY), inert: !!e.closest('[inert]') }
      })
      rows.push(JSON.stringify(r))
      if (r.body) break
      const key = r.tag + r.t + r.cls
      if (i > 0 && key === first) break
      if (i === 0) first = key
    }
    await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(900)
    await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); await sleep(500); await p.keyboard.press('Tab'); await sleep(300)
    const afterSkip = await p.evaluate(() => { const e = document.activeElement; return { t: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 24), cls: String(e.className).slice(0, 20), inMain: !!e.closest('main'), hash: location.hash } })
    return { rows, afterSkip }
  })

  await sec('nav', async () => {
    const R = {}
    await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(900)
    R.hist0 = await p.evaluate(() => history.length)
    await p.click('.hero-copy a.link'); await sleep(2200)
    R.click = await stOf(p); R.url1 = p.url(); R.hist1 = await p.evaluate(() => history.length)
    await p.goBack(); await sleep(1600); R.back = await stOf(p); R.urlBack = p.url()
    await p.goForward(); await sleep(1600); R.fwd = await stOf(p); R.urlFwd = p.url()
    await p.evaluate(() => scrollTo(0, 0)); await sleep(600)
    await p.click('.nav__link'); await sleep(2200); R.navHow = await stOf(p); R.urlNav = p.url()
    await p.click('a.logo'); await sleep(2400); R.logo = await stOf(p); R.urlLogo = p.url()
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await sleep(800)
    await p.click('.footer__link >> nth=0'); await sleep(2200); R.footHow = await stOf(p)
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await sleep(800)
    await p.click('.footer__link >> nth=1'); await sleep(2400); R.footTop = await stOf(p)
    return R
  })

  await sec('updates', async () => {
    const notes = () => p.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /open soon/i.test(e.textContent)).map((e) => { const b = e.getBoundingClientRect(); return e.tagName + '.' + String(e.className).slice(0, 20) + ' role=' + e.getAttribute('role') + ' live=' + (e.getAttribute('aria-live') || e.parentElement?.getAttribute('aria-live')) + ' op=' + getComputedStyle(e).opacity + ' w=' + Math.round(b.width) }))
    await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(1200)
    const R = {}
    R.count = (await p.$$('[data-updates]')).length
    await p.click('.hero-copy [data-updates]'); await p.click('.hero-copy [data-updates]'); await sleep(300)
    R.afterDouble = await notes(); await sleep(3800); R.after4s = await notes()
    await p.click('.nav [data-updates]'); await sleep(300); R.nav = await notes()
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await sleep(900)
    await p.click('.footer [data-updates]'); await sleep(300); R.footer = await notes(); R.url = p.url()
    return R
  })

  await sec('imgBytes', async () => {
    await p.goto(BASE, { waitUntil: 'networkidle' }); await sleep(800)
    await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 350) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)) } })
    await sleep(1500)
    const uniq = {}; net.img.forEach(([u, n]) => { uniq[u] = n })
    const list = Object.entries(uniq).sort((a, c) => c[1] - a[1]).map(([u, n]) => u + ' ' + Math.round(n / 1024) + 'KB')
    return { total: Math.round(Object.values(uniq).reduce((a, c) => a + c, 0) / 1024) + 'KB', list, hosts: [...net.hosts], nonGet: net.nonGet, bad: net.bad }
  })

  await sec('contrast', async () => {
    const R = {}
    for (const [w, h] of [[1440, 900], [375, 812]]) {
      const { ctx: c, p: pp } = await mk(w, h)
      await pp.goto(BASE, { waitUntil: 'networkidle' }); await sleep(1000)
      const rows = await pp.evaluate(() => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true })
        const parse = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255] }
        const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
        const over = (t, bt) => { const a = t[3]; return [t[0] * a + bt[0] * (1 - a), t[1] * a + bt[1] * (1 - a), t[2] * a + bt[2] * (1 - a), 1] }
        const bgOf = (el) => { const layers = []; let note = ''; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none') note = 'bg-image:' + String(e.className).slice(0, 16); const c = parse(cs.backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] >= 0.99) break } let base = [255, 255, 255, 1]; for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base); return { rgb: base, note } }
        const rows = []; const seen = new Set()
        for (const el of document.querySelectorAll('body *')) {
          if (!([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))) continue
          if (el.closest('script,style,svg')) continue
          const cs = getComputedStyle(el); const fg = parse(cs.color); const { rgb, note } = bgOf(el)
          const fgc = over(fg, rgb); const L1 = lum(fgc), L2 = lum(rgb); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
          const fs = parseFloat(cs.fontSize), fw = parseInt(cs.fontWeight); const large = fs >= 24 || (fs >= 18.66 && fw >= 700)
          const key = el.className + '|' + cs.color + '|' + fs + '|' + rgb.map(Math.round).join(',')
          if (seen.has(key)) continue; seen.add(key)
          rows.push({ cls: (el.tagName + '.' + String(el.className)).slice(0, 30), t: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 20), fs: Math.round(fs * 10) / 10, ratio: Math.round(ratio * 100) / 100, need: large ? 3 : 4.5, bg: rgb.map(Math.round).join(','), note: el.closest('.arrival') ? 'over photo, unmeasured' : note, inert: !!el.closest('[inert]') })
        }
        return rows
      })
      R[w] = { fails: rows.filter((r) => r.ratio < r.need).map((r) => JSON.stringify(r)), smallest: rows.sort((a, c) => a.fs - c.fs).slice(0, 8).map((r) => JSON.stringify(r)), n: rows.length }
      await c.close()
    }
    return R
  })

  await sec('overflow', async () => {
    const R = {}
    for (const [w, h] of [[320, 640], [375, 812], [768, 1024], [1024, 768], [1440, 900]]) {
      const { ctx: c, p: pp } = await mk(w, h)
      await pp.goto(BASE, { waitUntil: 'networkidle' }); await sleep(600)
      const bad = []
      for (const f of [0, 0.1, 0.2, 0.35, 0.5, 0.7, 0.85, 1]) {
        await pp.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f); await sleep(220)
        const o = await pp.evaluate(() => { const d = document.documentElement; const ov = d.scrollWidth > d.clientWidth; const y = scrollY; scrollTo(60, y); const sx = scrollX; scrollTo(0, y); return { ov, sw: d.scrollWidth, cw: d.clientWidth, canScrollX: sx > 0, off: ov ? [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > d.clientWidth + 1).slice(0, 4).map((e) => e.tagName + '.' + String(e.className).slice(0, 22)) : [] } })
        if (o.ov || o.canScrollX) bad.push([f, o])
      }
      R[w] = bad.length ? bad : 'none'
      await c.close()
    }
    return R
  })

  await sec('tap375', async () => {
    const { ctx: c, p: pm } = await mk(375, 812, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
    await pm.goto(BASE, { waitUntil: 'networkidle' }); await sleep(1200)
    const R = await pm.evaluate(() => [...document.querySelectorAll('a[href],button,[role=button],input,select,textarea,summary')].map((e) => { const r = e.getBoundingClientRect(); return (e.tagName + ' ' + (e.getAttribute('aria-label') || e.textContent).trim().replace(/\s+/g, ' ').slice(0, 24) + ' | ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' L' + Math.round(r.left) + ' R' + Math.round(r.right) + ' pageY' + Math.round(r.top + scrollY) + (e.closest('[inert]') ? ' INERT' : '')) }))
    await c.close()
    return R
  })

  await sec('hero', async () => {
    const R = {}
    for (const [w, h] of [[1440, 900], [1280, 720], [768, 1024], [375, 812]]) {
      const { ctx: c, p: pp } = await mk(w, h)
      await pp.goto(BASE, { waitUntil: 'networkidle' }); await sleep(3500)
      R[w + 'x' + h] = await pp.evaluate(() => {
        const rc = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] }
        const van = rc(document.querySelector('[data-van-body]'))
        const fact = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /exhaust fumes/i.test(e.textContent))
        const items = { h1: document.querySelector('h1'), p: document.querySelector('.hero-copy p'), btn: document.querySelector('.hero-copy .btn'), link: document.querySelector('.hero-copy .link'), fact: fact && (fact.closest('li') || fact.parentElement), note: [...document.querySelectorAll('.hero-copy *')].find((e) => e.children.length === 0 && /concept\. no etaxis/i.test(e.textContent)) }
        const o = { van, vh: innerHeight }
        for (const k in items) { const r = rc(items[k]); o[k] = r; if (r && van) { const ix = Math.max(0, Math.min(r[2], van[2]) - Math.max(r[0], van[0])), iy = Math.max(0, Math.min(r[3], van[3]) - Math.max(r[1], van[1])); o[k + '_ov'] = ix * iy } }
        return o
      })
      await c.close()
    }
    return R
  })

  await sec('enter', async () => {
    const { ctx: c, p: pp } = await mk(1440, 900)
    const xs = [], ys = [], rot = [], h1x = [], h1o = []
    const t0 = Date.now()
    pp.goto(BASE, { waitUntil: 'commit' }).catch(() => {})
    for (let i = 0; i < 48; i++) {
      try {
        const s = await pp.evaluate(() => {
          const v = document.querySelector('[data-van-body]'); const w = document.querySelector('[data-wheel="front"]'); const h = document.querySelector('h1')
          if (!v || !w || !h) return null
          const b = v.getBoundingClientRect(); const m = new DOMMatrix(getComputedStyle(w).transform); const hb = h.getBoundingClientRect()
          return [Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2), Math.round(Math.atan2(m.b, m.a) * 180 / Math.PI), Math.round(hb.left), +getComputedStyle(h).opacity]
        })
        if (s) { xs.push(s[0]); ys.push(s[1]); rot.push(s[2]); h1x.push(s[3]); h1o.push(s[4]) }
      } catch (e) {}
      await sleep(70)
    }
    await c.close()
    return { ms: Date.now() - t0, xs, ys, rot, h1x, h1o }
  })

  await sec('road', async () => {
    const R = {}
    for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
      const { ctx: c, p: pp } = await mk(w, h)
      await pp.goto(BASE, { waitUntil: 'networkidle' }); await sleep(1500)
      const angs = []; const det = []
      for (const f of [0.05, 0.08, 0.11, 0.14, 0.17, 0.2, 0.3, 0.5, 0.7]) {
        await pp.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f); await sleep(650)
        const s = await pp.evaluate(() => {
          const rc = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)].join(',') }
          const van = document.querySelector('[data-van-top]'); const m = new DOMMatrix(getComputedStyle(van).transform)
          const road = [...document.querySelectorAll('[class*="road"],[class*="trail"],[class*="traffic"],[class*="oncoming"],[class*="boda"],[class*="lane"],[class*="dash"]')].filter((e) => !/title|svg/.test(String(e.className))).map((e) => String(e.className).slice(0, 24) + ' ' + rc(e))
          return { ang: Math.round(Math.atan2(m.b, m.a) * 180 / Math.PI), van: rc(van), road }
        })
        angs.push(f + ':' + s.ang + ' van=' + s.van)
        if ((w === 1440 && [0.3, 0.5, 0.7].includes(f)) || (w === 375 && f === 0.5)) det.push({ f, road: s.road })
      }
      const arr = await pp.evaluate(() => {
        const rc = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.width)] }
        const pic = document.querySelector('[data-arrival-picture]'); const img = document.querySelector('[data-arrival-picture] img'); const h2 = document.querySelector('.arrival__title')
        let tr = null; if (h2) { const rg = document.createRange(); rg.selectNodeContents(h2); const b = rg.getBoundingClientRect(); tr = Math.round(b.left + b.width / 2) }
        const van = document.querySelector('[data-van-top]'); const vb = van.getBoundingClientRect()
        return { pic: rc(pic), img: rc(img), objPos: img && getComputedStyle(img).objectPosition, titleTextCentreX: tr, vw: innerWidth, vanTopOrigX: Math.round(vb.left + vb.width / 2) }
      })
      R[w] = { angs, det, arr }
      await c.close()
    }
    return R
  })

  await sec('resize', async () => {
    const R = []
    const { ctx: c, p: pp } = await mk(1440, 900)
    await pp.goto(BASE, { waitUntil: 'networkidle' }); await sleep(900)
    for (const f of [0.12, 0.45, 0.88]) {
      await pp.setViewportSize({ width: 1440, height: 900 }); await sleep(900)
      await pp.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f); await sleep(900)
      const s1 = await stOf(pp)
      await pp.setViewportSize({ width: 375, height: 812 }); await sleep(1600)
      const s2 = await stOf(pp)
      await pp.setViewportSize({ width: 1440, height: 900 }); await sleep(1600)
      const s3 = await stOf(pp)
      R.push({ f, s1: JSON.stringify(s1), s2: JSON.stringify(s2), s3: JSON.stringify(s3) })
    }
    await c.close()
    return R
  })

  await sec('static', async () => {
    const R = {}
    for (const [w, h, label] of [[1440, 900, 'rm1440'], [375, 812, 'rm375']]) {
      const { ctx: c, p: pp } = await mk(w, h, { reducedMotion: 'reduce' })
      await pp.goto(BASE, { waitUntil: 'networkidle' }); await sleep(800)
      await pp.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } })
      await sleep(900)
      R[label] = await pp.evaluate(() => ({ motion: document.documentElement.dataset.motion, h3: [...document.querySelectorAll('h3')].map((h) => { const r = h.getBoundingClientRect(); const cs = getComputedStyle(h); return h.textContent.trim().slice(0, 16) + ' w' + Math.round(r.width) + ' vis=' + cs.visibility + ' op=' + cs.opacity }), brokenImgs: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src), ov: document.documentElement.scrollWidth > innerWidth, pins: document.querySelectorAll('.pin-spacer').length }))
      await c.close()
    }
    const { ctx: c3, p: p3 } = await mk(1440, 900)
    await c3.addInitScript(() => { Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }) })
    await p3.goto(BASE, { waitUntil: 'networkidle' }); await sleep(800)
    R.saveData = await p3.evaluate(() => ({ motion: document.documentElement.dataset.motion, h: document.documentElement.scrollHeight, pins: document.querySelectorAll('.pin-spacer').length }))
    await c3.close()
    return R
  })

  await sec('notfound', async () => {
    const { ctx: c, p: pp } = await mk(1440, 900)
    const r = await pp.goto(BASE + '/nope-404', { waitUntil: 'networkidle' }); await sleep(600)
    const o = { status: r.status(), title: await pp.title(), h1: await pp.evaluate(() => document.querySelector('h1')?.textContent.trim()), path: await pp.evaluate(() => location.pathname) }
    await c.close(); return o
  })

  log('console', consoleErrs.length ? consoleErrs.slice(0, 20) : 'none')
  await b.close()
})().catch((e) => { console.log('FATAL', e); process.exit(1) })
