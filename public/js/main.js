/* ═══════════════════════════════════════════════════════════
   VintageTripmart - Main JavaScript
═══════════════════════════════════════════════════════════ */

'use strict';

// ── Navbar scroll effect ──────────────────────────────────
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
}

// ── Mobile hamburger ──────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        const spans = hamburger.querySelectorAll('span');
        spans.forEach(s => s.classList.toggle('active'));
    });
    navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
}

// ── Active nav link ───────────────────────────────────────
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');
    } else {
        link.classList.remove('active');
    }
});

// ── Animate on scroll (Intersection Observer) ─────────────
const animateEls = document.querySelectorAll(
    '.dest-card, .feature-card, .testimonial-card, .tour-card, .perk-item, .contact-item, .about-stat'
);
if (animateEls.length) {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, i * 80);
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1 }
    );
    animateEls.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// ── Hero section number count-up animation ────────────────
function animateCountUp(el, target, suffix = '') {
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 20);
}
document.querySelectorAll('.stat-num').forEach(el => {
    const text = el.textContent;
    const num = parseFloat(text.replace(/[^0-9.]/g, ''));
    const suffix = text.replace(/[0-9.,]/g, '');
    el.textContent = '0' + suffix;
    const obs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            animateCountUp(el, num, suffix);
            obs.disconnect();
        }
    });
    obs.observe(el);
});

// ── Toast notification system ─────────────────────────────
let toastEl = null;
function showToast(message, type = 'success') {
    if (toastEl) { toastEl.remove(); }
    toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.innerHTML = `
    <span>${type === 'success' ? '✅' : '❌'}</span>
    <span>${message}</span>
  `;
    document.body.appendChild(toastEl);
    requestAnimationFrame(() => toastEl.classList.add('show'));
    setTimeout(() => {
        toastEl.classList.remove('show');
        setTimeout(() => toastEl && toastEl.remove(), 400);
    }, 5000);
}

// ── Query Form Handler ────────────────────────────────────
const queryForm = document.getElementById('queryForm');
if (queryForm) {
    queryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = queryForm.querySelector('.form-submit');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Submitting...';

        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            destination: document.getElementById('destination').value,
            travelDate: document.getElementById('travelDate').value,
            travelers: parseInt(document.getElementById('travelers').value),
            budget: document.getElementById('budget').value,
            message: document.getElementById('message').value.trim(),
        };

        try {
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const result = await response.json();

            if (result.success) {
                showToast(result.message, 'success');
                queryForm.reset();
                // Scroll to top of form
                queryForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                showToast(result.message || 'Something went wrong. Please try again.', 'error');
            }
        } catch (err) {
            showToast('Network error. Please check your connection and try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// ── Tour filter buttons ───────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('.tour-card').forEach(card => {
            const category = card.dataset.category;
            const show = filter === 'all' || category === filter;
            card.style.display = show ? 'block' : 'none';
        });
    });
});

// ── Set min date for travel date inputs ───────────────────
document.querySelectorAll('input[type="date"]').forEach(input => {
    const today = new Date().toISOString().split('T')[0];
    input.setAttribute('min', today);
});

// ── Smooth reveal for section headers ─────────────────────
const headers = document.querySelectorAll('.section-header');
const headerObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            headerObs.unobserve(entry.target);
        }
    });
}, { threshold: 0.2 });
headers.forEach(h => {
    h.style.opacity = '0';
    h.style.transform = 'translateY(20px)';
    h.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    headerObs.observe(h);
});
