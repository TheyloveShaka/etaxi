const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')

const base = process.argv[2] || 'http://localhost:8082'
const pages = ['index.html', 'shop.html', 'about.html', 'contact.html', 'gallery.html', 'corporate.html']
const sizes = [[375, 812], [1440, 900]]

;(async () => {
  const browser = await chromium.launch()
  const rows = []
  for (const [w, h] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 })
    await ctx.addInitScript(() => { try { sessionStorage.setItem('loaderSeen', '1') } catch (e) {} })
    for (const p of pages) {
      const page = await ctx.newPage()
      const errors = []
      const failed = []
      page.on('pageerror', e => errors.push(e.message))
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
      page.on('requestfailed', r => failed.push(r.url().split('/').pop()))
      page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url().split('/').pop()) })
      await page.goto(`${base}/${p}`, { waitUntil: 'networkidle' })
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)) } window.scrollTo(0, 0) })
      const r = await page.evaluate(() => {
        const text = document.body.innerText
        const fonts = new Set()
        document.querySelectorAll('body *').forEach(e => {
          if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.offsetParent !== null) fonts.add(getComputedStyle(e).fontFamily.split(',')[0].replace(/"/g, ''))
        })
        const imgs = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map(i => i.getAttribute('src'))
        return {
          overflowX: document.documentElement.scrollWidth - innerWidth,
          emDash: (text.match(/\u2014/g) || []).length,
          placeholders: (text.match(/\{\{[A-Z_]+\}\}/g) || []),
          fonts: [...fonts],
          brokenImgs: imgs,
          noAlt: [...document.images].filter(i => !i.hasAttribute('alt')).length,
        }
      })
      rows.push({ page: p, w, ...r, errors: errors.slice(0, 3), failed: [...new Set(failed)].slice(0, 5) })
      await page.close()
    }
    await ctx.close()
  }
  await browser.close()
  for (const r of rows) {
    const bad = r.overflowX > 0 || r.emDash || r.errors.length || r.failed.length || r.brokenImgs.length || r.noAlt || r.fonts.some(f => !/^(Meow Script|DM Serif Display|Outfit)$/.test(f))
    console.log(`${bad ? 'FAIL' : 'ok  '} ${r.page} @${r.w} overflow=${r.overflowX} emDash=${r.emDash} fonts=${r.fonts.join('/')} broken=${r.brokenImgs.length} noAlt=${r.noAlt} errors=${r.errors.length} failed=${r.failed.join(',') || 0} placeholders=${r.placeholders.join(',') || 0}`)
    if (r.errors.length) console.log('     ' + r.errors.join(' | ').slice(0, 300))
  }
})()
