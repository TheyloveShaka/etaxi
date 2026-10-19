const path = require('path')
const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')
const url = process.argv[2] || 'https://theyloveshaka.github.io/etaxi/'
const out = path.join(__dirname, '..', '..', 'public', 'img', 'screens')
;(async () => {
  const b = await chromium.launch()
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
  const p = await c.newPage()
  await p.goto(url, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  const phones = await p.$$('.phone')
  const names = ['beacon', 'masaawo', 'fare', 'fare-door']
  for (let i = 0; i < phones.length && i < names.length; i++) {
    await phones[i].scrollIntoViewIfNeeded()
    await p.waitForTimeout(300)
    await phones[i].screenshot({ path: path.join(out, names[i] + '.png'), omitBackground: true })
    if (names[i] === 'masaawo') {
      await phones[i].evaluate(el => { el.closest('.stop').dataset.pressed = 'true' })
      await p.waitForTimeout(500)
      await phones[i].screenshot({ path: path.join(out, 'masaawo-pressed.png'), omitBackground: true })
    }
  }
  console.log('phones', phones.length)
  await b.close()
})()
