// Hamburger menu toggle
const hamburger = document.getElementById('hamburger');
const overlay = document.getElementById('mobile-nav-overlay');

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

// Navbar background on scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 100) {
    navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.08)';
  } else {
    navbar.style.boxShadow = 'none';
  }
});