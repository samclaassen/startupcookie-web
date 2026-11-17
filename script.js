// Hamburger menu toggle
const hamburger = document.getElementById('hamburger');
const overlay = document.getElementById('mobile-nav-overlay');

if (hamburger && overlay) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    overlay.classList.toggle('active');
    document.body.style.overflow = overlay.classList.contains('active') ? 'hidden' : '';
  });

  // Close mobile nav when clicking a link
  overlay.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

// Navbar background on scroll
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.08)';
    } else {
      navbar.style.boxShadow = 'none';
    }
  });
}

// Capacity roster line + waitlist CTA swap (values come from /site-config.js)
(function () {
  const cfg = window.SC_CONFIG;
  if (!cfg) return;
  const max = typeof cfg.MAX_CLIENTS === 'number' ? cfg.MAX_CLIENTS : 8;
  const roster = document.getElementById('capacity-roster');
  if (roster && typeof cfg.CLIENT_COUNT === 'number') {
    roster.textContent = 'Current roster: ' + cfg.CLIENT_COUNT + '/' + max + '.';
  }
  if (typeof cfg.CLIENT_COUNT === 'number' && cfg.CLIENT_COUNT >= max) {
    document.querySelectorAll('.js-capacity-cta').forEach(el => {
      el.textContent = 'Join the waitlist';
    });
  }
  if (typeof cfg.NEXT_OPENING === 'string' && cfg.NEXT_OPENING) {
    document.querySelectorAll('.js-next-opening-date').forEach(el => {
      el.textContent = cfg.NEXT_OPENING;
    });
    document.querySelectorAll('.js-next-opening').forEach(el => {
      el.classList.remove('hidden');
    });
    // If the top announcement banner is present, drop the floating nav below it.
    const announce = document.getElementById('announce');
    if (announce && navbar) {
      const setNavOffset = () => { navbar.style.top = (announce.offsetHeight + 8) + 'px'; };
      setNavOffset();
      window.addEventListener('resize', setNavOffset);
    }
  }
})();

// AI-referral attribution. When a visitor arrives from an AI assistant (by referrer or
// utm_source) or lands on /ai/, every Calendly "Book a call" link gets utm_source=<assistant>
// and utm_medium=ai-referral. Calendly stores these on the booking, so bookings can be
// counted by source. Remembered for the browser session only; nothing else is stored.
(function () {
  const ASSISTANTS = [
    ['chatgpt', /(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com)$/],
    ['claude', /(^|\.)claude\.ai$/],
    ['perplexity', /(^|\.)perplexity\.ai$/],
    ['gemini', /(^|\.)gemini\.google\.com$/],
    ['copilot', /(^|\.)copilot\.microsoft\.com$/],
    ['grok', /(^|\.)grok\.com$/],
    ['deepseek', /(^|\.)chat\.deepseek\.com$/],
    ['meta-ai', /(^|\.)meta\.ai$/],
    ['you', /(^|\.)you\.com$/]
  ];
  const KEY = 'sc_ai_source';
  function match(host) {
    host = (host || '').toLowerCase();
    for (const [name, re] of ASSISTANTS) if (re.test(host)) return name;
    return null;
  }
  let source = null;
  try { source = sessionStorage.getItem(KEY); } catch (e) {}
  if (!source) {
    const params = new URLSearchParams(location.search);
    const utm = params.get('utm_source');
    if (utm) source = match(utm.replace(/^https?:\/\//, '').split('/')[0]);
    if (!source && document.referrer) {
      try { source = match(new URL(document.referrer).hostname); } catch (e) {}
    }
    if (!source && /^\/ai\/?$/.test(location.pathname)) source = 'ai-assistant';
    if (source) { try { sessionStorage.setItem(KEY, source); } catch (e) {} }
  }
  if (!source) return;
  document.querySelectorAll('a[href*="calendly.com/"]').forEach(a => {
    try {
      const u = new URL(a.href);
      // Keep a specific assistant name over the generic /ai/ page tag.
      if (u.searchParams.get('utm_source') && u.searchParams.get('utm_source') !== 'ai-assistant' && source === 'ai-assistant') return;
      u.searchParams.set('utm_source', source);
      u.searchParams.set('utm_medium', 'ai-referral');
      if (!u.searchParams.get('utm_campaign')) u.searchParams.set('utm_campaign', 'ai-visit');
      a.href = u.toString();
    } catch (e) {}
  });
})();

// Google Analytics 4 (loads only when GA4_MEASUREMENT_ID is set in /site-config.js)
(function () {
  const cfg = window.SC_CONFIG;
  const id = cfg && cfg.GA4_MEASUREMENT_ID;
  if (!id || typeof id !== 'string' || !/^G-[A-Z0-9]+$/.test(id)) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', id);

  // Report "Book a call" (Calendly) clicks as a GA4 event, so it can be marked a key event
  // in GA4 and compared against AI referrers (chatgpt.com, claude.ai, perplexity.ai).
  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest ? e.target.closest('a[href*="calendly.com"]') : null;
    if (!a) return;
    gtag('event', 'book_call_click', {
      link_url: a.href,
      link_text: (a.textContent || '').trim().slice(0, 80),
      page_path: location.pathname
    });
  });
})();

// PromptWatch visitor analytics (loads only when PROMPTWATCH_PROJECT_ID is set in /site-config.js)
(function () {
  const cfg = window.SC_CONFIG;
  const id = cfg && cfg.PROMPTWATCH_PROJECT_ID;
  if (!id || typeof id !== 'string') return;
  const s = document.createElement('script');
  s.setAttribute('data-project-id', id);
  s.src = 'https://ingest.promptwatch.com/js/client.min.js';
  document.head.appendChild(s);
})();
