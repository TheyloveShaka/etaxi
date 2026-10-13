const path = require('path')
const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')
const url = process.argv[2]
const tag = process.argv[3] || 'page'
const out = path.join(__dirname, '..', '..', 'docs', 'shots')
;(async () => {
  const b = await chromium.launch()
  for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 })
    const p = await c.newPage(); const errs = []
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900)
    await p.screenshot({ path: path.join(out, `${tag}-${w}.png`), fullPage: true })
    const r = await p.evaluate(() => {
      const fonts = {}; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim()) continue; const f = getComputedStyle(n.parentElement).fontFamily.split(',')[0].replace(/"/g, '').trim(); fonts[f] = (fonts[f] || 0) + 1 }
      return { fonts, over: document.documentElement.scrollWidth > innerWidth, h: document.documentElement.scrollHeight, dashes: (document.body.innerText.match(/[\u2014\u2013]/g) || []).length, h1: document.querySelectorAll('h1').length }
    })
    console.log(w, JSON.stringify(r), 'errors', errs.length ? errs.join(' | ').slice(0, 200) : 0)
    await c.close()
  }
  await b.close()
})()
