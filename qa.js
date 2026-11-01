const { chromium } = require('playwright');
(async () => {
  const [base, ...pages] = process.argv.slice(2);
  const browser = await chromium.launch();
  for (const p of pages) {
    for (const [vue, width] of [['desktop', 1280], ['mobile', 390]]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const pbs = [];
      page.on('console', m => m.type() === 'error' && pbs.push('console: ' + m.text()));
      page.on('pageerror', e => pbs.push('js: ' + e.message));
      page.on('response', r => r.status() >= 400 && pbs.push(r.status() + ' ' + r.url()));
      await page.goto(`${base}/${p}`, { waitUntil: 'networkidle' }).catch(e => pbs.push('goto: ' + e.message));
      await page.waitForTimeout(900);
      const r = await page.evaluate(() => ({
        debordement: document.documentElement.scrollWidth > window.innerWidth,
        sansAlt: document.querySelectorAll('img:not([alt])').length,
        h1: [...document.querySelectorAll('h1')].filter(h => h.offsetParent).length,
        champsSansLabel: [...document.querySelectorAll('input,select,textarea')]
          .filter(el => el.type !== 'hidden' && !el.labels?.length && !el.getAttribute('aria-label')).length,
      }));
      const shot = `qa-${p.replace(/\W+/g, '_') || 'index'}-${vue}.png`;
      await page.screenshot({ path: shot, fullPage: true });
      console.log(`${p} [${vue}] problemes:${pbs.length} debordement:${r.debordement} imgSansAlt:${r.sansAlt} h1:${r.h1} champsSansLabel:${r.champsSansLabel} -> ${shot}`);
      pbs.forEach(x => console.log('  - ' + x));
      await page.close();
    }
  }
  await browser.close();
})();
