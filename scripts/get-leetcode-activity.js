const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteerExtra.use(StealthPlugin());

const PROFILE = 'https://leetcode.com/u/Benzema_9/';

function findDeep(obj, predicate, seen = new WeakSet()) {
  if (!obj || typeof obj !== 'object') return null;
  if (seen.has(obj)) return null;
  seen.add(obj);
  try {
    if (predicate(obj)) return obj;
  } catch (e) {}
  for (const k of Object.keys(obj)) {
    try {
      const res = findDeep(obj[k], predicate, seen);
      if (res) return res;
    } catch (e) {}
  }
  return null;
}

function sumLastYear(calendarObj) {
  // calendarObj: either { 'YYYY-MM-DD': count, ... } or an array of weeks/values
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setDate(now.getDate() - 365);

  // normalize to map of date->count
  let map = {};
  if (Array.isArray(calendarObj)) {
    // try to flatten array structures
    calendarObj.forEach(item => {
      if (item && typeof item === 'object') {
        if (item['date'] && typeof item['count'] !== 'undefined') map[item.date] = Number(item.count);
        else Object.keys(item).forEach(k => { if (/^\d{4}-\d{2}-\d{2}$/.test(k)) map[k] = Number(item[k]); });
      }
    });
  } else {
    Object.keys(calendarObj || {}).forEach(k => { map[k] = Number(calendarObj[k] || 0); });
  }

  const days = Object.keys(map).sort();
  let submissions = 0;
  let activeDays = 0;
  // Count submissions in last 365 days
  for (const d of days) {
    const dt = new Date(d + 'T00:00:00');
    if (dt >= oneYearAgo && dt <= now) {
      submissions += (map[d] || 0);
      if ((map[d] || 0) > 0) activeDays++;
    }
  }

  // compute max streak and current streak over last year
  const setActive = new Set(Object.keys(map).filter(d => map[d] > 0));
  let maxStreak = 0;
  let currStreak = 0;
  // iterate day by day from oneYearAgo to now
  let cursor = new Date(oneYearAgo);
  while (cursor <= now) {
    const key = cursor.toISOString().slice(0,10);
    if (setActive.has(key)) {
      currStreak++;
      if (currStreak > maxStreak) maxStreak = currStreak;
    } else {
      currStreak = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // current streak relative to today
  let todayStreak = 0;
  let d = new Date();
  while (true) {
    const key = d.toISOString().slice(0,10);
    if (setActive.has(key)) { todayStreak++; d.setDate(d.getDate() - 1); } else break;
  }

  return { submissions, activeDays, maxStreak, todayStreak };
}

(async () => {
  const browser = await puppeteerExtra.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

  try {
    await page.goto(PROFILE, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));

    // Diagnostic: grab visible text to look for activity phrases
    let bodyText = '';
    try {
      bodyText = await page.evaluate(() => document.body.innerText);
      console.log('---PAGE TEXT PREVIEW---');
      console.log(bodyText.slice(0, 4000));
      console.log('---END PREVIEW---');
    } catch (e) { console.error('Could not read body text:', e && e.message); }

    // Parse visible stats (fallback when calendar not directly available)
    try {
      const out = {};
      const submissionsMatch = bodyText.match(/([\d,]+)\s*submissions\s*in\s*the\s*past\s*one\s*year/i);
      if (submissionsMatch) out.submissionsPastYear = Number(submissionsMatch[1].replace(/,/g, ''));
      const activeMatch = bodyText.match(/Total active days\s*:??\s*([\d,]+)/i);
      if (activeMatch) out.totalActiveDays = Number(activeMatch[1].replace(/,/g, ''));
      const maxMatch = bodyText.match(/Max streak\s*:??\s*([\d,]+)/i);
      if (maxMatch) out.maxStreak = Number(maxMatch[1].replace(/,/g, ''));
      // months after the word 'Current' until 'Recent AC' or next heading
      const currIdx = bodyText.indexOf('\nCurrent');
      if (currIdx !== -1) {
        const after = bodyText.slice(currIdx + 1, currIdx + 400);
        const months = after.split(/\s+/).filter(t => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(t));
        if (months.length) out.months = months;
      }

      const outPath = path.join(__dirname, '..', 'assets', 'projects', 'leetcode-activity.json');
      fs.writeFileSync(outPath, JSON.stringify({ scrapedAt: new Date().toISOString(), ...out }, null, 2));
      console.log('Wrote activity summary to', outPath);

      // Attempt to extract per-day calendar data directly from the visible DOM
      try {
        const calendarMap = await page.evaluate(() => {
          const map = {};
          function parseTextForDateCount(text) {
            if (!text) return null;
            text = text.trim();
            const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
            if (iso) {
              const cnt = (text.match(/(\d+)\s*submissions?/i) || text.match(/(\d+)\s*solved/i) || text.match(/(\d+)/));
              return { date: iso[1], count: cnt ? Number(cnt[1].replace(/,/g, '')) : 0 };
            }
            const md = text.match(/([A-Za-z]{3,}\s+\d{1,2},\s*\d{4})/);
            if (md) {
              const d = new Date(md[1]);
              if (!isNaN(d)) {
                const isoDate = d.toISOString().slice(0, 10);
                const cnt = (text.match(/(\d+)\s*submissions?/i) || text.match(/(\d+)\s*solved/i) || text.match(/(\d+)/));
                return { date: isoDate, count: cnt ? Number(cnt[1].replace(/,/g, '')) : 0 };
              }
            }
            return null;
          }

          const nodes = Array.from(document.querySelectorAll('rect, g, div, span, li, td, a, svg'));
          for (const el of nodes) {
            const texts = [];
            try {
              if (el.getAttribute) {
                for (const attr of ['title', 'aria-label', 'data-tip', 'data-date', 'data-count', 'data-value', 'data-info']) {
                  const v = el.getAttribute(attr);
                  if (v) texts.push(v);
                }
              }
            } catch (e) {}
            try {
              const t = el.querySelector && el.querySelector('title');
              if (t && t.textContent) texts.push(t.textContent);
            } catch (e) {}
            try { if (el.innerText && el.innerText.length < 200) texts.push(el.innerText); } catch (e) {}

            for (const t of texts) {
              const parsed = parseTextForDateCount(t);
              if (parsed && parsed.date) {
                if (!(parsed.date in map) || (parsed.count > map[parsed.date])) map[parsed.date] = parsed.count;
              }
            }
          }

          // Also inspect title attributes globally
          try {
            const titled = Array.from(document.querySelectorAll('[title]')).map(el => el.getAttribute('title'));
            for (const t of titled) {
              const parsed = parseTextForDateCount(t);
              if (parsed && parsed.date) {
                if (!(parsed.date in map) || parsed.count > map[parsed.date]) map[parsed.date] = parsed.count;
              }
            }
          } catch (e) {}

          return map;
        });

        if (calendarMap && Object.keys(calendarMap).length > 0) {
          console.log('Extracted calendar map with', Object.keys(calendarMap).length, 'entries from DOM.');
          const statsFromCalendar = sumLastYear(calendarMap);
          const outFull = Object.assign({ scrapedAt: new Date().toISOString(), calendar: calendarMap }, statsFromCalendar);
          fs.writeFileSync(outPath, JSON.stringify(outFull, null, 2), 'utf8');
          console.log('Wrote full activity to', outPath);
        } else {
          console.log('No calendar entries found in DOM extraction.');
        }
      } catch (e) {
        console.error('DOM calendar extraction failed:', e && e.message);
      }
    } catch (e) {
      console.error('Error parsing visible stats:', e && e.message);
    }

    // Try to find Next.js payload or global variables and extract contributions/calendar
    const data = await page.evaluate(() => {
      try {
        const result = {};
        const nextScript = document.getElementById('__NEXT_DATA__');
        if (nextScript) {
          try { result.next = JSON.parse(nextScript.textContent || '{}'); } catch(e) { result.nextErr = e.message; }
        }
        try { result.windowNext = window.__NEXT_DATA__ || null; } catch(e) {}
        try { result.initial = window.__INITIAL_STATE__ || null; } catch(e) {}
        return result;
      } catch (e) { return { error: e.message }; }
    });

    // search for contributions/calendar in the data object
    let found = findDeep(data, o => o && (o.calendar || o.contributions || o.contributionCalendar || o.contributionsCalendar || o.contribution));

    // If not found, attempt to request the LeetCode GraphQL endpoint from the page context
    if (!found) {
      const gql = await page.evaluate(async () => {
        try {
          const query = `query getUserProfile($username: String!) { matchedUser(username: $username) { contributions { calendar } } }`;
          const res = await fetch('/graphql/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query, variables: {username: 'Benzema_9'}})
          });
          return await res.json();
        } catch (e) { return {error: e.message}; }
      });
      if (gql && gql.data && gql.data.matchedUser && gql.data.matchedUser.contributions) {
        found = gql.data.matchedUser.contributions;
      } else {
        // try alternative paths (apollo state)
        const apollo = findDeep(data, o => o && o.apolloInitialState);
        if (apollo) found = apollo;
      }
    }

    if (!found) {
      console.error('Could not find contributions/calendar on the profile page.');
      await browser.close();
      process.exit(2);
    }

    // normalize to calendar object
    let calendar = found.calendar || found.contributionCalendar || found.contributions || null;
    if (!calendar) {
      // try to locate nested calendar
      calendar = findDeep(found, o => o && (o.calendar || o.contributionCalendar)) || null;
      calendar = calendar && (calendar.calendar || calendar.contributionCalendar) || calendar;
    }

    if (!calendar) {
      // as last resort try to parse keys present in found
      const keys = Object.keys(found || {}).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
      if (keys.length) {
        const map = {};
        keys.forEach(k => map[k] = found[k]);
        calendar = map;
      }
    }

    if (!calendar) {
      console.error('Calendar not found in payload.');
      await browser.close();
      process.exit(3);
    }

    const stats = sumLastYear(calendar);
    const out = { calendarSample: Object.keys(calendar).length > 10 ? Object.keys(calendar).slice(0,10) : Object.keys(calendar), ...stats };

    // write a small JSON file in assets for the site to show
    const outPath = path.join(__dirname, '..', 'assets', 'projects', 'leetcode-activity.json');
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
    console.log('Wrote activity to', outPath);
    console.log(JSON.stringify(out, null, 2));

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    try { await browser.close(); } catch(e){}
    process.exit(4);
  }
})();
