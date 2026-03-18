const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'assets', 'projects');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const url = 'https://book-store-front-end-angular.vercel.app/login';

(async () => {
  const timestamp = Date.now();
  const email = `portfolio.test+${timestamp}@example.com`;
  const password = 'Ebrahim!2026';

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Opened login page');

    // Try to find and click register / sign up link/button
    const clicked = await page.evaluate(() => {
      const texts = ['sign up', 'signup', 'register', 'create account', 'create an account'];
      const candidates = [...document.querySelectorAll('a,button')];
      for (const el of candidates) {
        const txt = (el.innerText || '').trim().toLowerCase();
        if (!txt) continue;
        for (const t of texts) if (txt.includes(t)) { el.click(); return true; }
      }
      return false;
    });

    if (clicked) {
      console.log('Clicked register link, waiting for form...');
      await new Promise(r => setTimeout(r, 1200));
    } else {
      console.log('No explicit register link found — continuing to look for form on the page');
    }

    // Wait for input elements to appear
    await page.waitForSelector('input', { timeout: 8000 });

    // Inspect inputs and choose selectors
    const inputs = await page.$$eval('input', els => els.map((i, idx) => ({ idx, type: i.type, placeholder: i.placeholder || '', id: i.id || '', name: i.name || '' })));
    // Heuristics
    let emailSel = null, passSel = null, nameSel = null, submitSel = null;
    for (const inp of inputs) {
      const selector = `input:nth-of-type(${inp.idx + 1})`;
      const p = (inp.placeholder || '').toLowerCase();
      const n = (inp.name || '').toLowerCase();
      const id = (inp.id || '').toLowerCase();
      if (!emailSel && (inp.type === 'email' || p.includes('email') || n.includes('email') || id.includes('email'))) emailSel = selector;
      if (!passSel && inp.type === 'password') {
        // prefer first visible password as password
        if (!passSel) passSel = selector;
      }
      if (!nameSel && (p.includes('name') || n.includes('name') || id.includes('name') || p.includes('username') || n.includes('username') || id.includes('username'))) nameSel = selector;
    }

    // Fallbacks
    if (!emailSel) emailSel = 'input[type="email"]';
    if (!passSel) passSel = 'input[type="password"]';
    if (!nameSel) nameSel = 'input[type="text"]';

    console.log('Using selectors:', { emailSel, passSel, nameSel });

    // Fill fields (try sequentially but ignore errors)
    try { await page.click(nameSel); await page.type(nameSel, 'Ebrahim Mostafa', { delay: 30 }); } catch (e) { /* ignore */ }
    try { await page.click(emailSel); await page.type(emailSel, email, { delay: 30 }); } catch (e) { /* ignore */ }
    try { await page.click(passSel); await page.type(passSel, password, { delay: 30 }); } catch (e) { /* ignore */ }

    // Find and click submit button
    const submitted = await page.evaluate(() => {
      const texts = ['register', 'sign up', 'signup', 'create account', 'submit', 'create'];
      const candidates = [...document.querySelectorAll('button, input[type="submit"]')];
      for (const el of candidates) {
        const txt = (el.innerText || el.value || '').trim().toLowerCase();
        if (!txt) continue;
        for (const t of texts) if (txt.includes(t)) { el.click(); return true; }
      }
      // try to submit form
      const form = document.querySelector('form'); if (form) { form.submit(); return true; }
      return false;
    });

    console.log('Submitted form?', submitted);
    await new Promise(r => setTimeout(r, 2000));

    // After submit, try to log in if registration didn't happen
    // Navigate to home or dashboard to ensure logged-in state
    await page.goto('https://book-store-front-end-angular.vercel.app/', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 900));

    // If still on login, attempt to login manually
    const onLogin = page.url().includes('/login') || (await page.title()).toLowerCase().includes('login');
    if (onLogin) {
      console.log('Still on login page, attempting to login with same credentials');
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('input', { timeout: 5000 });
        await page.evaluate((email, password) => {
          const inputs = [...document.querySelectorAll('input')];
          let eEl = inputs.find(i => (i.type === 'email' || /email/i.test(i.placeholder) || /email/i.test(i.id) || /email/i.test(i.name)));
          if (!eEl) eEl = inputs.find(i => i.type === 'text');
          let pEl = inputs.find(i => i.type === 'password');
          if (eEl) { eEl.focus(); eEl.value = email; eEl.dispatchEvent(new Event('input', { bubbles: true })); }
          if (pEl) { pEl.focus(); pEl.value = password; pEl.dispatchEvent(new Event('input', { bubbles: true })); }
          const btn = [...document.querySelectorAll('button')].find(b => /log in|login|sign in|submit/i.test(b.innerText));
          if (btn) btn.click();
        }, email, password);
        await new Promise(r => setTimeout(r, 2500));
      } catch (e) { console.log('Login attempt failed', e.message); }
    }

    // Final: navigate to a likely authenticated page and screenshot
    const target = 'https://book-store-front-end-angular.vercel.app/';
    await page.goto(target, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1200));
    const outPath = path.join(outDir, 'bookstore.png');
    await page.screenshot({ path: outPath, fullPage: false });
    console.log('Saved screenshot to', outPath);

    // Save credentials locally for reference (local file only)
    const credFile = path.join(__dirname, '..', 'assets', 'projects', 'bookstore-credentials.txt');
    fs.writeFileSync(credFile, `email=${email}\npassword=${password}\ncreatedAt=${new Date().toISOString()}\n`);
    console.log('Wrote credentials to', credFile);

  } catch (err) {
    console.error('Error capturing bookstore', err && err.message ? err.message : err);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
})();
