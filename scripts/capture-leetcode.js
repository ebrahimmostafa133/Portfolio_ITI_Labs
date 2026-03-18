const fs = require('fs');
const path = require('path');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());
const puppeteer = puppeteerExtra;

const outDir = path.join(__dirname, '..', 'assets', 'projects');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const profileUrl = 'https://leetcode.com/u/Benzema_9/';
const outPath = path.join(outDir, 'leetcode.png');

(async () => {
  console.log('Launching browser (stealth)...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });

  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    // Give the page a moment to render dynamic parts
    await new Promise(r => setTimeout(r, 1200));

    // Try to find the activity/contributions area and scroll into view
    try {
      await page.evaluate(() => {
        const candidates = document.querySelectorAll('div');
        for (const c of candidates) {
          if ((c.innerText || '').toLowerCase().includes('activity') || (c.className || '').toLowerCase().includes('activity') || (c.id || '').toLowerCase().includes('activity')) {
            c.scrollIntoView({ behavior: 'auto', block: 'center' });
            break;
          }
        }
      });
      await new Promise(r => setTimeout(r, 600));
    } catch (e) {
      // ignore
    }

    // Capture screenshot
    await page.screenshot({ path: outPath, fullPage: false });
    console.log('Saved LeetCode screenshot to', outPath);
  } catch (err) {
    console.error('Failed capturing LeetCode profile:', err && err.message ? err.message : err);
  } finally {
    await browser.close();
  }
})();
