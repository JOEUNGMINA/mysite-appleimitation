/* =========================================================
   Apple-style clone — interactions
   ========================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- global nav: search dropdown ---------- */
  var searchBtn = $('searchBtn');
  var gnavSearch = $('gnavSearch');
  var searchInput = $('searchInput');

  function setSearch(open) {
    gnavSearch.hidden = !open;
    searchBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      setMenu(false);
      searchInput.focus();
    }
  }

  searchBtn.addEventListener('click', function () {
    setSearch(gnavSearch.hidden);
  });

  /* ---------- global nav: mobile menu ---------- */
  var burger = $('burger');
  var mobileMenu = $('mobileMenu');

  function setMenu(open) {
    mobileMenu.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  burger.addEventListener('click', function () {
    setMenu(mobileMenu.hidden);
    if (!mobileMenu.hidden) { setSearch(false); }
  });

  mobileMenu.addEventListener('click', function (e) {
    if (e.target.closest('a')) { setMenu(false); }
  });

  /* close overlays with Escape or outside click */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      setSearch(false);
      setMenu(false);
    }
  });

  document.addEventListener('click', function (e) {
    if (!gnavSearch.hidden && !e.target.closest('.gnav')) { setSearch(false); }
  });

  /* ---------- entertainment carousel ---------- */
  var track = $('entTrack');
  var prev = $('entPrev');
  var next = $('entNext');

  function step() {
    var card = track.querySelector('.ent-card');
    if (!card) { return 300; }
    var gap = parseInt(getComputedStyle(track).columnGap, 10) || 12;
    return card.getBoundingClientRect().width + gap;
  }

  function syncNav() {
    var max = track.scrollWidth - track.clientWidth - 1;
    prev.disabled = track.scrollLeft <= 0;
    next.disabled = track.scrollLeft >= max;
    prev.style.opacity = prev.disabled ? 0.35 : 1;
    next.style.opacity = next.disabled ? 0.35 : 1;
  }

  prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
  next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
  track.addEventListener('scroll', syncNav, { passive: true });
  window.addEventListener('resize', syncNav);
  syncNav();

  /* ---------- reveal on scroll ----------
     A rAF-throttled sweep rather than IntersectionObserver: an instant jump
     (anchor link, scroll restoration) moves an element from below the viewport
     to above it without ever flipping isIntersecting, so IO delivers no entry
     and the element stays invisible. A sweep re-checks every pending element. */
  var pending = Array.prototype.slice.call(
    document.querySelectorAll('.hero-copy, .hero-art, .tile-copy, .tile-art, .ent-title')
  );

  pending.forEach(function (el) { el.classList.add('reveal'); });

  var ticking = false;

  function sweep() {
    ticking = false;
    var trigger = window.innerHeight * 0.9;
    pending = pending.filter(function (el) {
      if (el.getBoundingClientRect().top < trigger) {
        el.classList.add('in');
        return false;
      }
      return true;
    });
    if (!pending.length) {
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
    }
  }

  function request() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(sweep);
    }
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  sweep();
})();
