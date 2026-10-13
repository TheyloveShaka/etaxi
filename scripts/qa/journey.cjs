const path = require('path')
const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')

const url = process.argv[2] || 'http://localhost:4310'
const tag = process.argv[3] || 'journey'
const width = Number(process.argv[4] || 1440)
const height = Number(process.argv[5] || 900)
const fracs = (process.argv[6] || '0,0.04,0.08,0.12,0.16,0.2,0.3,0.45,0.6,0.75,0.88,0.96').split(',').map(Number)
const out = path.join(__dirname, '..', '..', 'docs', 'shots')

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2600)
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  for (let i = 0; i < fracs.length; i++) {
    await page.evaluate(y => window.scrollTo(0, y), Math.round(max * fracs[i]))
    await page.waitForTimeout(900)
    await page.screenshot({ path: path.join(out, `${tag}-${width}-${String(i).padStart(2, '0')}.png`) })
    const probe = await page.evaluate(() => {
      const box = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height), op: cs.opacity, vis: cs.visibility } }
      return { side: box('[data-van]'), top: box('[data-van-top]'), active: document.querySelector('[data-journey-view]')?.dataset.activeStage ?? null, overflowX: document.documentElement.scrollWidth > innerWidth }
    })
    console.log(fracs[i], JSON.stringify(probe))
  }
  console.log('max', max, 'errors', errors.length ? errors.join(' | ') : 0)
  await browser.close()
})()
