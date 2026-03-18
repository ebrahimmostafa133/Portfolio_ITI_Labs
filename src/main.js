document.addEventListener('DOMContentLoaded', () => {
    // Current Year
    const yearElem = document.getElementById('current-year');
    if (yearElem) {
        yearElem.textContent = new Date().getFullYear();
    }

    // Mobile Menu Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navbarDefault = document.getElementById('navbar-default');

    if (menuToggle && navbarDefault) {
        menuToggle.addEventListener('click', () => {
            const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
            menuToggle.setAttribute('aria-expanded', !isExpanded);
            navbarDefault.classList.toggle('hidden');
        });

        // Close menu when clicking a link
        document.querySelectorAll('#navbar-default a').forEach(link => {
            link.addEventListener('click', () => {
                navbarDefault.classList.add('hidden');
                menuToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // Theme Toggle Logic
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
    const themeToggleBtn = document.getElementById('theme-toggle');

    if (themeToggleBtn && themeToggleDarkIcon && themeToggleLightIcon) {
        // Change the icons inside the button based on previous settings
        if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            themeToggleLightIcon.classList.remove('hidden');
        } else {
            themeToggleDarkIcon.classList.remove('hidden');
        }

        themeToggleBtn.addEventListener('click', function () {
            // toggle icons inside button
            themeToggleDarkIcon.classList.toggle('hidden');
            themeToggleLightIcon.classList.toggle('hidden');

            // if set via local storage previously
            if (localStorage.getItem('color-theme')) {
                if (localStorage.getItem('color-theme') === 'light') {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('color-theme', 'dark');
                } else {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('color-theme', 'light');
                }
            } else {
                if (document.documentElement.classList.contains('dark')) {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('color-theme', 'light');
                } else {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('color-theme', 'dark');
                }
            }
        });
    }

    // Reveal on scroll (small, dependency-free animation)
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length) {
        const revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('show');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        revealElements.forEach(el => revealObserver.observe(el));
    }

    // Active nav link while scrolling
    const navLinks = document.querySelectorAll('#navbar-default a[href^="#"]');
    if (navLinks.length) {
        const sections = Array.from(navLinks).map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navLinks.forEach(l => l.classList.remove('nav-active'));
                    const active = document.querySelector('#navbar-default a[href="#' + entry.target.id + '"]');
                    if (active) active.classList.add('nav-active');
                }
            });
        }, { threshold: 0.6 });

        sections.forEach(s => sectionObserver.observe(s));
    }

    // Copy email to clipboard
    const copyBtn = document.getElementById('copy-email-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const email = document.getElementById('contact-email')?.textContent?.trim() || 'ibrahimmostafa9939@gmail.com';
            try {
                await navigator.clipboard.writeText(email);
                const original = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = original || 'Copy'; }, 2000);
            } catch (err) {
                window.prompt('Copy email:', email);
            }
        });
    }

    // Back to top button
    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
        const onScroll = () => {
            if (window.scrollY > 400) backToTop.classList.add('show'); else backToTop.classList.remove('show');
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // Load LeetCode activity summary (scraped JSON) and update cylinder visuals
    (function loadLeetCodeActivity() {
        // Try several likely paths (local server, GitHub Pages subpath, absolute)
        const candidates = [
            './assets/projects/leetcode-activity.json',
            'assets/projects/leetcode-activity.json',
            '/assets/projects/leetcode-activity.json',
            window.location.pathname.replace(/\/[^\/]*$/, '/') + 'assets/projects/leetcode-activity.json'
        ];

        function fetchFirst(paths) {
            return paths.reduce((p, url) => {
                return p.catch(() => fetch(url, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('not ok'); return r.json(); }));
            }, Promise.reject());
        }

        fetchFirst(candidates).then(data => {
            const mapping = [
                { key: 'submissionsPastYear', label: 'submissions', defaultMax: 1000 },
                { key: 'totalActiveDays', label: 'activeDays', defaultMax: 365 },
                { key: 'maxStreak', label: 'maxStreak', defaultMax: 365 },
            ];

            mapping.forEach(m => {
                const container = document.querySelector(`.cylinder[data-key="${m.key}"]`);
                const fill = container?.querySelector('.cylinder-fill');
                const label = document.querySelector(`[data-label="${m.label}"]`);
                if (!container || !fill || !label) return;
                const max = Number(container.dataset.max || m.defaultMax) || m.defaultMax;
                const value = Number(data[m.key] || 0);
                const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
                fill.style.height = pct + '%';
                label.textContent = (isNaN(value) ? '--' : value.toString());
            });

            const updatedEl = document.getElementById('leetcode-activity-updated');
            if (updatedEl && data.scrapedAt) updatedEl.textContent = new Date(data.scrapedAt).toLocaleString();
            // Render calendar: if we have a real calendar map use it, otherwise synthesize one from summaries
            function renderCalendarFromMap(map) {
                const container = document.getElementById('leetcode-calendar');
                if (!container) return;
                container.innerHTML = '';
                const today = new Date();
                const start = new Date();
                start.setDate(today.getDate() - 365);
                // align to Sunday
                while (start.getDay() !== 0) start.setDate(start.getDate() - 1);

                // build weeks
                const weeks = [];
                const iter = new Date(start);
                while (iter <= today) {
                    const week = [];
                    for (let i = 0; i < 7; i++) {
                        const key = iter.toISOString().slice(0,10);
                        week.push({ date: key, count: Number(map[key] || 0) });
                        iter.setDate(iter.getDate() + 1);
                    }
                    weeks.push(week);
                }

                // compute max count
                let maxCount = 0;
                weeks.forEach(w => w.forEach(d => { if (d.count > maxCount) maxCount = d.count; }));

                function colorForCount(c) {
                    const colors = ['#ebedf0','#c6e48b','#7bc96f','#239a3b','#196127'];
                    if (!c || c === 0) return colors[0];
                    if (maxCount === 0) return colors[4];
                    const p = c / maxCount;
                    if (p > 0.75) return colors[4];
                    if (p > 0.5) return colors[3];
                    if (p > 0.25) return colors[2];
                    return colors[1];
                }

                container.style.display = 'flex';
                container.style.gap = '4px';
                container.style.overflowX = 'auto';
                weeks.forEach(week => {
                    const col = document.createElement('div');
                    col.style.display = 'flex';
                    col.style.flexDirection = 'column';
                    col.style.gap = '4px';
                    week.forEach(day => {
                        const cell = document.createElement('div');
                        cell.style.width = '12px';
                        cell.style.height = '12px';
                        cell.style.borderRadius = '3px';
                        cell.style.background = colorForCount(day.count);
                        cell.title = `${day.date}: ${day.count} submissions`;
                        col.appendChild(cell);
                    });
                    container.appendChild(col);
                });
            }

            function synthesizeCalendar(data) {
                // data: submissionsPastYear, totalActiveDays, maxStreak
                const totalActive = Number(data.totalActiveDays || data.activeDays || 0);
                const totalSub = Number(data.submissionsPastYear || data.submissions || 0);
                const maxStreak = Number(data.maxStreak || 0);
                const today = new Date();
                const start = new Date(); start.setDate(today.getDate() - 365);
                // make array of dates
                const dates = [];
                const cur = new Date(start);
                while (cur <= today) { dates.push(cur.toISOString().slice(0,10)); cur.setDate(cur.getDate()+1); }

                const map = {};
                // initialize
                dates.forEach(d => map[d] = 0);

                // place a max streak ending today (if possible)
                const L = dates.length;
                const streakLen = Math.min(maxStreak || 0, L);
                let streakEndIndex = L - 1; // end today
                let streakStartIndex = Math.max(0, streakEndIndex - streakLen + 1);
                for (let i = streakStartIndex; i <= streakEndIndex; i++) { map[dates[i]] = 1; }

                // fill remaining active days
                let remainingActive = Math.max(0, totalActive - streakLen);
                // spread remaining active days across the year (every ~interval)
                const interval = Math.max(1, Math.floor(L / Math.max(1, remainingActive)));
                let idx = 0;
                while (remainingActive > 0 && idx < L) {
                    if (map[dates[idx]] === 0) { map[dates[idx]] = 1; remainingActive--; }
                    idx += interval;
                }

                // distribute remaining submissions (beyond 1 per active day)
                let sumActive = Object.values(map).filter(v => v>0).length;
                let extras = Math.max(0, totalSub - sumActive);
                // distribute extras randomly across active days
                const activeDates = Object.keys(map).filter(k => map[k] > 0);
                let i = 0;
                while (extras > 0 && activeDates.length) {
                    const key = activeDates[i % activeDates.length];
                    map[key] += 1;
                    extras--;
                    i++;
                }

                return map;
            }

            // Try to use real calendar if available in JSON
            if (data && data.calendar && Object.keys(data.calendar).length > 0) {
                try { renderCalendarFromMap(data.calendar); return; } catch(e) {}
            }

            // else synthesize
            try {
                const synth = synthesizeCalendar(data);
                renderCalendarFromMap(synth);
            } catch (e) { console.debug('Failed to synthesize calendar', e && e.message); }
        }).catch(err => {
            // silent fail
            console.debug('LeetCode activity JSON not loaded:', err && err.message);
        });
    })();
});
