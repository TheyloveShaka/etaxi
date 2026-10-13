const path = require('path')
const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')
const url = process.argv[2] || 'http://localhost:4310'
const out = path.join(__dirname, '..', '..', 'docs', 'shots')

;(async () => {
  const browser = await chromium.launch()
  const res = {}
  const errs = []
  const mk = async (w, h, extra = {}) => { const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, ...extra }); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) }); return p }

  let p = await mk(1440, 900)
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500)
  res.fonts = await p.evaluate(() => {
    const seen = {}
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const n = walker.currentNode
      if (!n.textContent.trim()) continue
      const f = getComputedStyle(n.parentElement).fontFamily.split(',')[0].replace(/["']/g, '').trim()
      seen[f] = (seen[f] || 0) + 1
    }
    return seen
  })
  res.dashes = await p.evaluate(() => (document.body.innerText.match(/[\u2014\u2013]/g) || []).length)
  res.title = await p.title()
  res.head = await p.evaluate(() => ({ desc: !!document.querySelector('meta[name=description]')?.content, og: document.querySelector('meta[property="og:image"]')?.content, icon: document.querySelector('link[rel=icon]')?.href, ld: !!document.querySelector('script[type="application/ld+json"]'), h1: document.querySelectorAll('h1').length, lang: document.documentElement.lang }))
  await p.click('.hero-copy [data-updates]')
  await p.waitForTimeout(400)
  res.updatesShown = await p.evaluate(() => [...document.querySelectorAll('[role=status]')].map(e => e.textContent.trim()).filter(Boolean))
  await p.waitForTimeout(3300)
  res.updatesAfter = await p.evaluate(() => [...document.querySelectorAll('[role=status]')].map(e => e.textContent.trim()).filter(Boolean))
  await p.click('.hero-copy a[href="#how"]')
  await p.waitForTimeout(2200)
  res.anchor = await p.evaluate(() => ({ y: Math.round(scrollY), active: document.querySelector('[data-journey-view]')?.dataset.activeStage }))
  const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  await p.evaluate(y => scrollTo(0, y), Math.round(max * 0.5)); await p.waitForTimeout(900)
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2600)
  res.reload = await p.evaluate(() => { const r = document.querySelector('[data-van-top]').getBoundingClientRect(); return { y: Math.round(scrollY), topVan: [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)], active: document.querySelector('[data-journey-view]').dataset.activeStage } })
  await p.screenshot({ path: path.join(out, 'chk-reload.png') })
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(900)
  await p.screenshot({ path: path.join(out, 'chk-backtop.png') })

  p = await mk(768, 1024)
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500)
  const m2 = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  for (const [i, f] of [0.3, 0.52].entries()) { await p.evaluate(y => scrollTo(0, y), Math.round(m2 * f)); await p.waitForTimeout(900); await p.screenshot({ path: path.join(out, `chk-768-${i}.png`) }) }

  p = await mk(320, 640)
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500)
  res.overflow320 = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  await p.screenshot({ path: path.join(out, 'chk-320.png') })

  for (const w of [1440, 375]) {
    p = await mk(w, w === 1440 ? 900 : 812, { reducedMotion: 'reduce' })
    await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
    res['static' + w] = await p.evaluate(() => ({ motion: document.documentElement.dataset.motion, h: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth > innerWidth }))
    await p.screenshot({ path: path.join(out, `chk-static-${w}.png`), fullPage: true })
  }
  res.errors = errs
  console.log(JSON.stringify(res, null, 1))
  await browser.close()
})()
