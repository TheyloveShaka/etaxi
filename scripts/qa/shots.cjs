const path = require('path')
const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')

const url = process.argv[2] || 'http://localhost:8082'
const tag = process.argv[3] || 'hero'
const out = path.join(__dirname, '..', '..', 'docs', 'shots')
const sizes = [
  [1440, 900],
  [1280, 720],
  [768, 1024],
  [375, 812],
]

;(async () => {
  const browser = await chromium.launch()
  for (const [width, height] of sizes) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 })
    if (!process.env.LOADER) await context.addInitScript(() => { try { sessionStorage.setItem('loaderSeen', '1') } catch (e) {} })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(out, `${tag}-${width}.png`) })
    await page.screenshot({ path: path.join(out, `${tag}-${width}-full.png`), fullPage: true })
    console.log(`${width}x${height} scrollH=${await page.evaluate(() => document.documentElement.scrollHeight)} errors=${errors.length ? errors.join(' | ') : 0}`)
    await context.close()
  }
  await browser.close()
})()
