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
                    const target = entry.target;
                    target.classList.add('show');
                    // stagger child reveals when present
                    const children = Array.from(target.querySelectorAll('.reveal-child'));
                    children.forEach((c, i) => {
                        // set slight staggered delay
                        c.style.transitionDelay = `${i * 80}ms`;
                    });
                    obs.unobserve(target);
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

    // Live LeetCode refresh: reload card image and attempt to fetch fresh stats
    (function leetLive(){
        const darkImg = document.getElementById('leetcard-dark');
        const lightImg = document.getElementById('leetcard-light');
        const liveSolvedEl = document.getElementById('live-solved');
        const liveUpdatedEl = document.getElementById('live-solved-updated');
        const refreshBtn = document.getElementById('refresh-leetcode');

        function bumpUrl(base){
            if(!base) return base;
            try { const u = new URL(base); u.searchParams.set('_', Date.now()); return u.toString(); } catch(e) { return base + (base.includes('?') ? '&' : '?') + '_=' + Date.now(); }
        }

        function refreshImgs(){
            if(darkImg){ const base = darkImg.dataset?.src || darkImg.src; darkImg.src = bumpUrl(base); }
            if(lightImg){ const base = lightImg.dataset?.src || lightImg.src; lightImg.src = bumpUrl(base); }
        }

        async function fetchGraphQLStats(){
            try {
                const q = 'query getUserSubmitStats($username:String!){matchedUser(username:$username){submitStats{acSubmissionNum{difficulty count submissions}}}}';
                const res = await fetch('https://leetcode.com/graphql', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ query: q, variables: { username: 'Benzema_9' } }), cache: 'no-store' });
                if(!res.ok) throw new Error('status '+res.status);
                const js = await res.json();
                const arr = js?.data?.matchedUser?.submitStats?.acSubmissionNum;
                if(arr && arr.length){ const all = arr.find(a=>a.difficulty==='All') || arr[0]; if(all && liveSolvedEl){ liveSolvedEl.textContent = all.count; liveUpdatedEl.textContent = new Date().toLocaleTimeString(); return true; } }
            } catch(e){ console.debug('LeetCode GraphQL error', e && e.message); }
            return false;
        }

        async function fetchLeetcardSVG(){
            try {
                const base = (document.documentElement.classList.contains('dark') ? (darkImg?.dataset?.src || darkImg?.src) : (lightImg?.dataset?.src || lightImg?.src));
                if(!base) return false;
                const url = bumpUrl(base);
                const res = await fetch(url, { cache: 'no-store' });
                if(!res.ok) throw new Error('status '+res.status);
                const txt = await res.text();
                const m = txt.match(/<text[^>]*id="total-solved-text"[^>]*>([\d,]+)/i) || txt.match(/>([\d,]+)\s*Solved/i);
                if(m){ const n = Number(m[1].replace(/,/g,'')); if(liveSolvedEl){ liveSolvedEl.textContent = n; liveUpdatedEl.textContent = new Date().toLocaleTimeString(); return true; } }
            } catch(e){ console.debug('Leetcard fetch failed', e && e.message); }
            return false;
        }

        async function refreshAndUpdate(){
            refreshImgs();
            const ok = await fetchGraphQLStats();
            if(!ok) await fetchLeetcardSVG();
        }

        // initial + periodic + focus refresh
        setTimeout(refreshAndUpdate, 600);
        const timer = setInterval(refreshAndUpdate, 30 * 1000);
        document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') refreshAndUpdate(); });
        window.addEventListener('focus', refreshAndUpdate);
        refreshBtn?.addEventListener('click', refreshAndUpdate);
    })();

    // Background fireworks animation (canvas). Respects prefers-reduced-motion.
    (function initFireworks(){
        if (typeof document === 'undefined') return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const bg = document.getElementById('bg-animations');
        const content = document.getElementById('content') || document.body;
        const canvas = document.createElement('canvas');
        canvas.id = 'fireworks-canvas';
        canvas.style.position = 'fixed';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '5';
        canvas.style.pointerEvents = 'none';
        canvas.style.mixBlendMode = 'screen';

        if (bg && bg.parentNode) bg.parentNode.insertBefore(canvas, content);
        else document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d', { alpha: true });
        let DPR = window.devicePixelRatio || 1;
        function resize(){
            DPR = window.devicePixelRatio || 1;
            canvas.width = Math.floor(window.innerWidth * DPR);
            canvas.height = Math.floor(window.innerHeight * DPR);
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            ctx.setTransform(DPR,0,0,DPR,0,0);
        }
        window.addEventListener('resize', resize);
        resize();

        const particles = [];
        const maxParticles = 900;
        const gravity = 0.06;
        const friction = 0.99;
        const palette = ['#FF5F6D','#FFC371','#7C4DFF','#18A999','#FFD166','#FF7AB6','#60A5FA'];

        function rand(min,max){ return Math.random()*(max-min)+min; }

        class Particle{
            constructor(x,y,vx,vy,size,color,ttl){
                this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.size=size; this.color=color; this.ttl=ttl; this.life=ttl; this.alpha=1;
            }
            update(){
                this.vx *= friction; this.vy *= friction; this.vy += gravity; this.x += this.vx; this.y += this.vy; this.life--; this.alpha = Math.max(0, this.life/this.ttl);
            }
            draw(){
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.fillStyle = this.color; ctx.globalAlpha = this.alpha; ctx.shadowBlur = 12; ctx.shadowColor = this.color; ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill(); ctx.restore();
            }
        }

        function createBurst(x,y,count){
            for(let i=0;i<count;i++){
                if(particles.length > maxParticles) break;
                const angle = Math.random()*Math.PI*2; const speed = rand(1.6,6.2);
                const vx = Math.cos(angle)*speed; const vy = Math.sin(angle)*speed;
                const color = palette[Math.floor(Math.random()*palette.length)]; const size = rand(1.6,4.2); const ttl = Math.floor(rand(40,100));
                particles.push(new Particle(x,y,vx,vy,size,color,ttl));
            }
        }

        function animate(){
            ctx.clearRect(0,0, canvas.width/DPR, canvas.height/DPR);
            for(let i=particles.length-1;i>=0;i--){
                const p = particles[i]; p.update();
                if(p.life<=0 || p.y > (canvas.height/DPR + 200) || p.x < -200 || p.x > (canvas.width/DPR + 200)) { particles.splice(i,1); continue; }
                p.draw();
            }
            requestAnimationFrame(animate);
        }
        animate();

        // periodic bursts at random positions near top
        let periodic = setInterval(()=>{
            const x = rand(window.innerWidth*0.08, window.innerWidth*0.92);
            const y = rand(window.innerHeight*0.06, window.innerHeight*0.28);
            createBurst(x,y, Math.floor(rand(24,52)));
        }, 2600 + Math.random()*2600);

        // trigger burst on click/tap inside content
        (document.getElementById('content') || document.body).addEventListener('click', (e)=>{
            const x = e.clientX; const y = e.clientY; createBurst(x,y, Math.floor(rand(18,44)));
        });

        // pause/resume when tab visibility changes
        document.addEventListener('visibilitychange', ()=>{
            if(document.visibilityState === 'hidden'){ clearInterval(periodic); }
            else { periodic = setInterval(()=>{ const x = rand(window.innerWidth*0.08, window.innerWidth*0.92); const y = rand(window.innerHeight*0.06, window.innerHeight*0.28); createBurst(x,y, Math.floor(rand(24,52))); }, 2600 + Math.random()*2600); }
        });
    })();
});
