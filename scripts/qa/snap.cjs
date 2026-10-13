const { chromium } = require("C:/Users/DELL/Desktop/projects/Money makers/frozen-basket/node_modules/playwright");
const [url, out, w = "1440", h = "900", wait = "1500", full = "", scroll = "", click = ""] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.addInitScript(() => sessionStorage.setItem("loaderSeen", "1"));
  await page.goto(url, { waitUntil: "load" });
  if (scroll === "bottom") await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  if (scroll === "walk") {
    await page.waitForTimeout(1500);
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 140));
      }
      window.scrollTo(0, 0);
    });
  }
  await page.waitForTimeout(+wait);
  if (click) {
    await page.click(click);
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: out, fullPage: full === "full", type: "jpeg", quality: 72 });
  if (errors.length) console.log("ERRORS", errors.slice(0, 6));
  await browser.close();
})();
