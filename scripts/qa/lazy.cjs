const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')
;(async () => {
  const b = await chromium.launch()
  for (const rm of ['reduce', 'no-preference']) {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: rm })
    const p = await c.newPage()
    await p.goto('http://localhost:4310', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
    const h = await p.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y < h; y += 700) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(120) }
    await p.waitForTimeout(1200)
    console.log(rm, JSON.stringify(await p.evaluate(() => [...document.images].map(i => [i.getAttribute('src').split('/').pop(), i.complete && i.naturalWidth > 0]))))
    await c.close()
  }
  await b.close()
})()
