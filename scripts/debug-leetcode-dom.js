const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());
const puppeteer = puppeteerExtra;

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  try {
    await page.goto('https://leetcode.com/u/Benzema_9/', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1200));
    const results = await page.evaluate(() => {
      const out = [];
      const keywords = ['submissions in the past one year','Total active days','Max streak','Current'];
      const all = Array.from(document.querySelectorAll('*'));
      for (const el of all) {
        try {
          const text = (el.innerText || '').toLowerCase();
          for (const k of keywords) {
            if (text.includes(k.toLowerCase())) {
              out.push({ keyword: k, snippet: el.parentElement ? el.parentElement.innerHTML.slice(0,800) : el.innerHTML.slice(0,800) });
            }
          }
        } catch (e) {}
      }
      return out.slice(0,10);
    });
    console.log('Found', results.length, 'matches');
    results.forEach((r,i) => {
      console.log('---MATCH',i,'keyword=',r.keyword,'---');
      console.log(r.snippet);
      console.log('---END---\n');
    });
  } catch (e) { console.error(e && e.message); }
  await browser.close();
})();
