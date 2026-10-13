const path = require('path')
const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')

const url = process.argv[2] || 'http://localhost:4310'
const tag = process.argv[3] || 'roll'
const width = Number(process.argv[4] || 1440)
const height = Number(process.argv[5] || 900)
const times = (process.argv[6] || '150,400,650,900,1150,1500,2200').split(',').map(Number)
const out = path.join(__dirname, '..', '..', 'docs', 'shots')

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  const t0 = Date.now()
  for (const t of times) {
    const wait = t - (Date.now() - t0)
    if (wait > 0) await page.waitForTimeout(wait)
    await page.screenshot({ path: path.join(out, `${tag}-${width}-${t}.png`) })
  }
  const info = await page.evaluate(() => {
    const r = s => document.querySelector(s).getBoundingClientRect()
    const v = r('[data-van]'), g = r('[data-ground]'), c = r('[data-hero-copy]')
    return { vanLeft: v.left, vanRight: v.right, vanCentreVw: ((v.left + v.right) / 2 / innerWidth) * 100, vanBottom: v.bottom, groundTop: g.top, copyRight: c.right, wheel: getComputedStyle(document.querySelector('[data-wheel="front"]')).transform }
  })
  console.log(JSON.stringify(info))
  await browser.close()
})()
