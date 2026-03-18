const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const credPath = path.join(__dirname, '..', 'assets', 'projects', 'bookstore-credentials.txt');
if (!fs.existsSync(credPath)) {
  console.error('Credentials file not found:', credPath);
  process.exit(1);
}

const raw = fs.readFileSync(credPath, 'utf8');
const lines = raw.split(/\n/).filter(Boolean);
const creds = {};
for (const l of lines) {
  const [k, v] = l.split('='); if (k) creds[k.trim()] = (v||'').trim();
}

const url = 'https://book-store-front-end-angular.vercel.app/login';

(async () => {
  const email = creds.email;
  const password = creds.password;
  console.log('Using', email);

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 900));

    // Fill email & password
    await page.evaluate((email, password) => {
      const inputs = [...document.querySelectorAll('input')];
      let eEl = inputs.find(i => (i.type === 'email' || /email/i.test(i.placeholder) || /email/i.test(i.id) || /email/i.test(i.name)));
      if (!eEl) eEl = inputs.find(i => i.type === 'text');
      let pEl = inputs.find(i => i.type === 'password');
      if (eEl) { eEl.focus(); eEl.value = email; eEl.dispatchEvent(new Event('input', { bubbles: true })); }
      if (pEl) { pEl.focus(); pEl.value = password; pEl.dispatchEvent(new Event('input', { bubbles: true })); }
      const btn = [...document.querySelectorAll('button')].find(b => /sign in|signin|log in|login/i.test(b.innerText));
      if (btn) btn.click();
    }, email, password);

    await new Promise(r => setTimeout(r, 2500));

    // Try to navigate to books page
    await page.goto('https://book-store-front-end-angular.vercel.app/books', { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1200));

    const outPath = path.join(__dirname, '..', 'assets', 'projects', 'bookstore.png');
    await page.screenshot({ path: outPath, fullPage: false });
    console.log('Saved screenshot to', outPath);

  } catch (err) {
    console.error(err && err.message ? err.message : err);
  } finally {
    await browser.close();
  }
})();
