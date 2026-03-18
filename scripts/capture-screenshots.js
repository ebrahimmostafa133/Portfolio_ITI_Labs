const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'assets', 'projects');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const projects = [
  { slug: 'social', url: 'https://social-g7h6qmykg-ebrahim-mostafas-projects.vercel.app' },
  { slug: 'ecommerce', url: 'https://heroic-semifreddo-f8b898.netlify.app/' },
  { slug: 'note', url: 'https://note-page-uqwi-46ucbsa65-ebrahim-mostafas-projects.vercel.app/' },
  { slug: 'bookmarker', url: 'https://ebrahimmostafa133.github.io/Frontend-Diploma/JS-Assignment3/' },
  { slug: 'weather', url: 'https://ebrahimmostafa133.github.io/Frontend-Diploma/JS-Assignment5/' },
  { slug: 'mealify', url: 'https://ebrahimmostafa133.github.io/Frontend-Diploma/Assignment6/' },
  { slug: 'quote', url: 'https://ebrahimmostafa133.github.io/Frontend-Diploma/JS-Assignment2/' },
];

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  for (const p of projects) {
    const outPath = path.join(outDir, `${p.slug}.png`);
    try {
      console.log(`Capturing ${p.url} -> ${outPath}`);
      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 60000 });
      // small wait to let any animations finish
      await new Promise((res) => setTimeout(res, 900));
      await page.screenshot({ path: outPath, fullPage: false });
      console.log('Saved', outPath);
    } catch (err) {
      console.error('Failed to capture', p.url, err && err.message ? err.message : err);
    }
  }

  await browser.close();
  console.log('Done.');
})();
