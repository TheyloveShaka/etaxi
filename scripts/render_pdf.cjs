const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { chromium } = require('C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright')

const root = path.join(__dirname, '..')
const jobs = process.argv.length > 3
  ? [[process.argv[2], process.argv[3]]]
  : [['proposal/detailed.html', 'public/docs/eTaxi-Proposal.pdf'], ['proposal/summary.html', 'public/docs/eTaxi-Executive-Summary.pdf']]

;(async () => {
  const browser = await chromium.launch()
  for (const [src, out] of jobs) {
    const file = path.join(root, src)
    if (!fs.existsSync(file)) { console.log('skip', src); continue }
    const target = path.join(root, out)
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('requestfailed', r => errors.push('failed ' + r.url()))
    await page.goto('file:///' + file.split(path.sep).join('/'), { waitUntil: 'networkidle' })
    await page.emulateMedia({ media: 'print' })
    await page.evaluate(() => document.fonts.ready)
    const pdf = () => page.pdf({ path: target, preferCSSPageSize: true, printBackground: true })
    await pdf()

    const entries = await page.evaluate(() => [...document.querySelectorAll('.toc a')].map(a => {
      const h = document.querySelector(a.getAttribute('href') + ' h1')
      const label = h?.querySelector('.num')?.textContent.trim() || ''
      const title = h ? [...h.childNodes].filter(n => !(n.nodeType === 1 && n.classList.contains('num'))).map(n => n.textContent).join(' ').trim() : ''
      return { href: a.getAttribute('href'), label, title }
    }))
    if (entries.length) {
      const tmp = target + '.toc.json'
      fs.writeFileSync(tmp, JSON.stringify(entries))
      const map = JSON.parse(execFileSync('python', [path.join(__dirname, 'toc_pages.py'), target, tmp], { encoding: 'utf8' }))
      fs.unlinkSync(tmp)
      await page.evaluate(m => document.querySelectorAll('.toc a').forEach(a => {
        const span = document.createElement('span')
        span.className = 'p'
        span.textContent = m[a.getAttribute('href')] ?? ''
        a.appendChild(span)
      }), map)
      await pdf()
    }

    const report = await page.evaluate(() => {
      const fonts = {}
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        const node = walker.currentNode
        if (!node.textContent.trim()) continue
        const family = getComputedStyle(node.parentElement).fontFamily.split(',')[0].replace(/"/g, '').trim()
        fonts[family] = (fonts[family] || 0) + 1
      }
      const text = document.body.innerText
      return { fonts, dashes: (text.match(/[\u2014\u2013]/g) || []).length, words: text.split(/\s+/).length }
    })
    console.log(out, Math.round(fs.statSync(target).size / 1024) + ' kB', JSON.stringify(report), 'errors', errors.length ? errors.join(' | ') : 0)
    await page.close()
  }
  await browser.close()
})()
