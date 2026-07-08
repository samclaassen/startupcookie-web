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
  const max = typeof cfg.MAX_CLIENTS === 'number' ? cfg.MAX_CLIENTS : 6;
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
  }
})();
