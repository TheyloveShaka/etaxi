const path = require('path')
const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')
;(async () => {
  const b = await chromium.launch()
  for (const [w, h] of [[1440, 900], [1280, 720], [1024, 768], [768, 1024]]) {
    const c = await b.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage()
    const errs = []; p.on('pageerror', e => errs.push(e.message))
    await p.goto('http://localhost:4312', { waitUntil: 'networkidle' }); await p.waitForTimeout(2300)
    const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
    let worst = 1e9, shown = 0
    for (const f of [0.22, 0.3, 0.38, 0.46, 0.54, 0.62, 0.7]) {
      await p.evaluate(y => scrollTo(0, y), Math.round(max * f)); await p.waitForTimeout(700)
      const g = await p.evaluate(() => {
        const vis = [...document.querySelectorAll('.stop.is-active .stop__visual > *, .stop.is-active .stop__copy')].map(e => e.getBoundingClientRect())
        const out = []
        for (const s of document.querySelectorAll('[data-sign]')) {
          if (getComputedStyle(s).display === 'none') continue
          const q = s.getBoundingClientRect(); if (q.bottom < 0 || q.top > innerHeight) continue
          for (const v of vis) { const ox = Math.min(q.right, v.right) - Math.max(q.left, v.left); const oy = Math.min(q.bottom, v.bottom) - Math.max(q.top, v.top); out.push(oy > 0 ? -ox : 999) }
        }
        return { gaps: out, shown: [...document.querySelectorAll('[data-sign]')].filter(s => getComputedStyle(s).display !== 'none').length, over: document.documentElement.scrollWidth > innerWidth }
      })
      shown = g.shown; for (const v of g.gaps) worst = Math.min(worst, v)
      if (w === 1440 && f === 0.62) await p.screenshot({ path: path.join(__dirname, '..', '..', 'docs', 'shots', 'vfy-sign2.png') })
    }
    console.log(w, 'signsShown', shown, 'worstGapPx', worst === 1e9 ? 'none in view' : Math.round(worst), 'errors', errs.length)
    await c.close()
  }
  await b.close()
})()
