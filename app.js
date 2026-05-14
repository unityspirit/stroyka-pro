/* ═══════════════════════════════════════
   СТРОЙПРО — ScrollCanvas Engine
   ═══════════════════════════════════════ */
'use strict';

/* ── Constants ──────────────────────────── */
const TOTAL_FRAMES = 576;
const PAGE_COUNT = 6;
const LERP = 0.08;
const CONCURRENCY = 48;

/* ── State ──────────────────────────────── */
let scrollPos = 0;
let targetScroll = 0;
let currentFrame = 0;
let images = new Array(TOTAL_FRAMES);
let loadedCount = 0;
let isLoading = true;
const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768;

/* ── DOM refs ───────────────────────────── */
const canvas = document.getElementById('scrollCanvas');
const ctx = canvas.getContext('2d');
const loader = document.getElementById('loader');
const loaderFill = document.getElementById('loaderFill');
const loaderPct = document.getElementById('loaderPct');
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link');
const burger = document.getElementById('burger');
const mobileNav = document.getElementById('mobileNav');

/* ── Canvas sizing ──────────────────────── */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawFrame();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* ── Frame path ─────────────────────────── */
function framePath(i) {
  const dir = isMobile ? 'frames-mobile' : 'frames-webp';
  const num = String(i).padStart(6, '0');
  return `${dir}/frame_${num}.webp`;
}

/* ── Preload frames ─────────────────────── */
let failCount = 0;
function preloadFrames() {
  let idx = 0;
  let active = 0;

  /* Fallback: if no frames exist, show site after 3s */
  const fallbackTimer = setTimeout(() => {
    if (loadedCount === 0 || failCount >= CONCURRENCY) finishLoading();
  }, 3000);

  function next() {
    while (active < CONCURRENCY && idx < TOTAL_FRAMES) {
      const i = idx++;
      active++;
      const img = new Image();
      img.onload = () => { images[i] = img; active--; loadedCount++; progress(); next(); };
      img.onerror = () => { active--; failCount++; loadedCount++; progress(); next(); };
      img.src = framePath(i + 1);
    }
  }

  function progress() {
    const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
    loaderFill.style.width = pct + '%';
    loaderPct.textContent = pct + '%';
    if (loadedCount >= TOTAL_FRAMES) { clearTimeout(fallbackTimer); finishLoading(); }
  }

  next();
}

function finishLoading() {
  isLoading = false;
  loader.classList.add('hidden');
  pages[0].classList.add('active');
  revealElements(0);
  drawFrame();
}

/* ── Draw frame ─────────────────────────── */
function drawFrame() {
  const idx = Math.min(Math.max(Math.round(currentFrame), 0), TOTAL_FRAMES - 1);
  const img = images[idx];
  if (!img) return;

  const cw = canvas.width, ch = canvas.height;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale, dh = ih * scale;
  const dx = (cw - dw) / 2, dy = (ch - dh) / 2;

  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

/* ── Scroll handling ────────────────────── */
const MAX_SCROLL = (PAGE_COUNT - 1) * 1000;

function onWheel(e) {
  e.preventDefault();
  targetScroll = Math.max(0, Math.min(targetScroll + e.deltaY * 1.2, MAX_SCROLL));
}
window.addEventListener('wheel', onWheel, { passive: false });

/* Touch */
let touchY = 0;
window.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchmove', e => {
  const dy = touchY - e.touches[0].clientY;
  touchY = e.touches[0].clientY;
  targetScroll = Math.max(0, Math.min(targetScroll + dy * 3, MAX_SCROLL));
}, { passive: true });

/* ── Animation loop ─────────────────────── */
function animate() {
  scrollPos += (targetScroll - scrollPos) * LERP;
  const normScroll = scrollPos / MAX_SCROLL;
  currentFrame = normScroll * (TOTAL_FRAMES - 1);
  drawFrame();

  /* Active page */
  const rawPage = (scrollPos / 1000);
  const pageIdx = Math.round(rawPage);

  pages.forEach((p, i) => {
    if (i === pageIdx) {
      p.classList.add('active');
      revealElements(i);
    } else {
      p.classList.remove('active');
    }
  });

  /* Nav highlight */
  navLinks.forEach(l => {
    const s = parseInt(l.dataset.section);
    l.classList.toggle('active', s === pageIdx);
  });

  requestAnimationFrame(animate);
}

/* ── Reveal ──────────────────────────────── */
const revealed = new Set();
function revealElements(idx) {
  if (revealed.has(idx)) return;
  revealed.add(idx);
  const els = pages[idx].querySelectorAll('.reveal');
  els.forEach((el, i) => {
    setTimeout(() => el.classList.add('visible'), i * 120);
  });
}

/* ── Nav clicks ─────────────────────────── */
navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const s = parseInt(link.dataset.section);
    targetScroll = s * 1000;
    /* Close mobile */
    mobileNav.classList.remove('open');
    burger.classList.remove('open');
  });
});

/* Buttons with data-section */
document.querySelectorAll('[data-section]').forEach(el => {
  if (el.classList.contains('nav-link')) return;
  el.addEventListener('click', e => {
    e.preventDefault();
    targetScroll = parseInt(el.dataset.section) * 1000;
  });
});

/* ── Burger ──────────────────────────────── */
burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  mobileNav.classList.toggle('open');
});

/* ── Keyboard ───────────────────────────── */
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); targetScroll = Math.min(targetScroll + 1000, MAX_SCROLL); }
  if (e.key === 'ArrowUp') { e.preventDefault(); targetScroll = Math.max(targetScroll - 1000, 0); }
});

/* ── Init ────────────────────────────────── */
preloadFrames();
requestAnimationFrame(animate);

/* ── Form submit ─────────────────────────── */
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.textContent = '✓ Заявка отправлена!';
    btn.style.background = '#4ECDC4';
    setTimeout(() => { btn.textContent = 'Отправить заявку'; btn.style.background = ''; }, 3000);
  });
}
