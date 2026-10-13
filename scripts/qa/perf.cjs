const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')
const url = process.argv[2] || 'http://localhost:4312'

;(async () => {
  const browser = await chromium.launch()
  for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['phone', 375, 812, true]]) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    let bytes = 0
    cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength })
    await page.addInitScript(() => {
      window.__lcp = 0; window.__long = []; window.__cls = 0
      new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)) }).observe({ type: 'longtask', buffered: true })
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.goto(url, { waitUntil: 'load' })
    await page.waitForTimeout(4000)
    const load = await page.evaluate(() => ({ lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(4), longLoad: window.__long.slice() }))
    await page.evaluate(() => { window.__long = [] })
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
    for (let y = 0; y <= max; y += 120) { await page.mouse.wheel(0, 120); await page.waitForTimeout(40) }
    await page.waitForTimeout(800)
    const scroll = await page.evaluate(() => window.__long)
    console.log(name, JSON.stringify({ ...load, kB: Math.round(bytes / 1024), longScroll: scroll.length, longScrollMax: scroll.length ? Math.max(...scroll) : 0 }))
    await context.close()
  }
  await browser.close()
})()
