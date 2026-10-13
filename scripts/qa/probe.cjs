const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')
const [w, h] = (process.argv[2] || '768x1024').split('x').map(Number)
;(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 }); const p = await c.newPage()
  await p.goto(process.argv[3] || 'http://localhost:8082', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500)
  console.log(JSON.stringify(await p.evaluate(new Function(process.argv[4] || 'return document.title')), null, 1))
  await b.close()
})()
