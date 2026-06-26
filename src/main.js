import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initVideoBackground();
  initCustomCursor();
  initMagneticButtons();
  initTimelineScroll();
  initFloatingBadges();
  initFormInteractions();
  initLayoutAnimations();
});

/**
 * 1. Initialize Lenis Smooth Scroll
 */
let lenisInstance;
function initSmoothScroll() {
  lenisInstance = new Lenis({
    duration: 1.6,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.5,
    infinite: false,
  });

  // Connect Lenis to ScrollTrigger
  lenisInstance.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenisInstance.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

/**
 * 2. Initialize Scroll-Driven Video Background
 */
function initVideoBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const frameCount = 240;
  
  // Format frame filename with zero padding (e.g. ezgif-frame-001.jpg)
  const getFrameUrl = (index) => `/bg video/ezgif-frame-${index.toString().padStart(3, '0')}.jpg`;

  // Preload container
  const images = [];
  const bgSequence = { frame: 0 };
  let lastRenderedFrame = -1;

  // Create image elements and start background preloading
  for (let i = 1; i <= frameCount; i++) {
    const img = new Image();
    img.src = getFrameUrl(i);
    images.push(img);
  }

  // Draw a frame using cover scale logic (acts like background-size: cover)
  function drawImageProp(ctx, img, x, y, w, h, offsetX = 0.5, offsetY = 0.5) {
    const iw = img.width;
    const ih = img.height;
    const r = Math.min(w / iw, h / ih);
    let nw = iw * r;
    let nh = ih * r;
    let cx = 0;
    let cy = 0;
    let cw = iw;
    let ch = ih;
    let ar = 1;

    if (nw < w) ar = w / nw;
    if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;
    nw *= ar;
    nh *= ar;

    cw = iw / (nw / w);
    ch = ih / (nh / h);

    cx = (iw - cw) * offsetX;
    cy = (ih - ch) * offsetY;

    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    if (cw > iw) cw = iw;
    if (ch > ih) ch = ih;

    ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
  }

  // Render current frame to canvas
  function render() {
    const frameIndex = Math.round(bgSequence.frame);
    if (frameIndex === lastRenderedFrame) return; // skip redundant draws!

    const img = images[frameIndex];

    if (img && img.complete && img.naturalWidth !== 0) {
      drawImageProp(ctx, img, 0, 0, canvas.width, canvas.height);
      lastRenderedFrame = frameIndex;
    } else {
      // Find the closest loaded frame to prevent black flicker/flashing
      let closestImg = null;
      let minDiff = Infinity;
      for (let i = 0; i < images.length; i++) {
        const curImg = images[i];
        if (curImg && curImg.complete && curImg.naturalWidth !== 0) {
          const diff = Math.abs(i - frameIndex);
          if (diff < minDiff) {
            minDiff = diff;
            closestImg = curImg;
          }
        }
      }
      if (closestImg) {
        drawImageProp(ctx, closestImg, 0, 0, canvas.width, canvas.height);
        const closestIndex = images.indexOf(closestImg);
        lastRenderedFrame = closestIndex;
      }
    }
  }

  // Set canvas size
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    render();
  }

  // Bind resize event
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Once first image is loaded, draw it immediately
  if (images[0]) {
    images[0].onload = render;
  }

  // Bind frame sequence to page scroll using GSAP ScrollTrigger
  gsap.to(bgSequence, {
    frame: frameCount - 1,
    ease: 'none',
    scrollTrigger: {
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2, // adds a smooth ease/momentum to scroll video playback
      onUpdate: render
    }
  });

  // Keep drawing as other images load in background to update static display
  images.forEach(img => {
    img.addEventListener('load', render);
  });
}

/**
 * 3. Premium Interactive Cursor Follower
 */
function initCustomCursor() {
  const cursor = document.getElementById('custom-cursor');
  const cursorRing = document.getElementById('custom-cursor-ring');
  if (!cursor || !cursorRing) return;

  // Position cursor on mouse movement
  window.addEventListener('mousemove', (e) => {
    gsap.set(cursor, {
      x: e.clientX,
      y: e.clientY
    });
    gsap.to(cursorRing, {
      x: e.clientX,
      y: e.clientY,
      duration: 0.35,
      ease: 'power2.out'
    });
  });

  // Toggle hover scale class
  const hoverables = document.querySelectorAll('a, button, .service-card, .tech-card, .service-tag, .floating-badge');
  hoverables.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      document.body.classList.add('hovered');
    });
    el.addEventListener('mouseleave', () => {
      document.body.classList.remove('hovered');
    });
  });

  // Hide cursor on window mouseleave
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = 0;
    cursorRing.style.opacity = 0;
  });
  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = 1;
    cursorRing.style.opacity = 1;
  });
}

/**
 * 4. Magnetic Button Pull Effect
 */
function initMagneticButtons() {
  const magneticElements = document.querySelectorAll('.btn-magnetic');
  
  // Disable magnetic effect on mobile touch screens for better UX
  if (window.innerWidth <= 991) return;

  magneticElements.forEach((btn) => {
    // Avoid double magnetic binding on floating badges, since badges have their own custom tilt-magnetic math
    if (btn.classList.contains('floating-badge')) return;

    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      // Pull element subtly (35% intensity)
      gsap.to(btn, {
        x: x * 0.35,
        y: y * 0.35,
        duration: 0.3,
        ease: 'power2.out'
      });
    });

    btn.addEventListener('mouseleave', () => {
      // Elastic return to center
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.35)'
      });
    });
  });
}

/**
 * 5. GSAP ScrollTrigger Configurations
 */
function initTimelineScroll() {
  // A. Overlapping 3D Card Stacking (Inspired by CRED.club — Desktop only)
  const workSlides = document.getElementById('work-slides');
  const slides = gsap.utils.toArray('.work-slide');

  if (workSlides && slides.length > 0) {
    let mm = gsap.matchMedia();
    
    mm.add('(min-width: 992px)', () => {
      slides.forEach((slide, i) => {
        if (i < slides.length - 1) {
          gsap.to(slide, {
            scale: 0.94 - (slides.length - i - 1) * 0.015, // Layered scale deck
            opacity: 0.45,
            yPercent: -5 * (slides.length - i - 1),        // Subtle vertical stack shift
            scrollTrigger: {
              trigger: slides[i + 1],
              start: 'top 85%',
              end: 'top 20%',
              scrub: true
            }
          });
        }
      });
    });
  }

  // B. Process Timeline Active Step Highlights
  const steps = document.querySelectorAll('.timeline-step');
  steps.forEach((step) => {
    ScrollTrigger.create({
      trigger: step,
      start: 'top 55%',
      end: 'bottom 45%',
      onEnter: () => step.classList.add('active'),
      onLeave: () => step.classList.remove('active'),
      onEnterBack: () => step.classList.add('active'),
      onLeaveBack: () => step.classList.remove('active')
    });
  });

  // C. Floating Header Transparency on Scroll
  const header = document.getElementById('main-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // D. Mobile Menu Toggle
  const menuToggle = document.getElementById('menu-toggle');
  const mainNav = document.getElementById('main-nav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      mainNav.classList.toggle('active');
      menuToggle.classList.toggle('active');
    });

    // Close menu when navigation links are clicked
    const links = document.querySelectorAll('.nav-link, .nav-cta');
    links.forEach((link) => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('active');
        menuToggle.classList.remove('active');
      });
    });
  }
}

/**
 * 6. Interactive Floating Service Badges
 */
function initFloatingBadges() {
  const badges = [
    { id: '#badge-web', rot: 0 },
    { id: '#badge-ai', rot: 0 },
    { id: '#badge-growth', rot: 0 },
    { id: '#badge-workflow', rot: 0 },
    { id: '#badge-voice', rot: 0 },
    { id: '#badge-conversion', rot: 0 }
  ];

  badges.forEach(({ id, rot }) => {
    const el = document.querySelector(id);
    if (!el) return;

    // Set initial rot
    gsap.set(el, { rotation: rot });

    // Mouse movement micro hover tilt (only on desktop)
    if (window.innerWidth > 991) {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        gsap.to(el, {
          x: x * 0.35,
          y: y * 0.35,
          rotation: rot + x * 0.06,
          duration: 0.3,
          overwrite: 'auto',
          ease: 'power2.out'
        });
      });

      el.addEventListener('mouseleave', () => {
        // Return elastic return to default layout
        gsap.to(el, {
          x: 0,
          y: 0,
          rotation: rot,
          duration: 0.6,
          overwrite: 'auto',
          ease: 'elastic.out(1, 0.4)'
        });
      });
    }
  });
}

/**
 * 7. Interactive Contact Form Handler & Tags Select
 */
function initFormInteractions() {
  const tags = document.querySelectorAll('.service-tag');
  tags.forEach((tag) => {
    tag.addEventListener('click', (e) => {
      e.preventDefault();
      tag.classList.toggle('selected');
    });
  });

  // Handle inquiry submission
  const form = document.getElementById('inquiry-form');
  const status = document.getElementById('form-status');
  if (!form || !status) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Extract selected tags list
    const selectedServices = [];
    document.querySelectorAll('.service-tag.selected').forEach((el) => {
      selectedServices.push(el.dataset.val);
    });

    const payload = {
      name: document.getElementById('user-name').value,
      email: document.getElementById('user-email').value,
      services: selectedServices,
      message: document.getElementById('user-message').value
    };

    console.log('Premium Inquiry Submitted:', payload);
    
    // Success feedback animation
    status.textContent = "Request received. We will connect in 12 hours.";
    status.className = "form-status show success";
    
    gsap.from(status, {
      y: 10,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out'
    });

    form.reset();
    document.querySelectorAll('.service-tag.selected').forEach((el) => {
      el.classList.remove('selected');
    });

    setTimeout(() => {
      status.className = "form-status";
    }, 6000);
  });
}

/**
 * 8. Staggered Text & Element Entrances & Scroll Transitions
 */
function initLayoutAnimations() {
  // Giant title letters stagger reveal on initial load
  gsap.from('.title-word', {
    y: '100%',
    duration: 1.3,
    stagger: 0.15,
    ease: 'power4.out',
    delay: 0.1
  });

  // Hero massive title zoom & fade out on scroll
  gsap.to('#massive-title', {
    scale: 2.2,
    opacity: 0,
    yPercent: -15, // Lift upward slightly
    ease: 'power1.inOut',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom 20%',
      scrub: 1.2
    }
  });

  // Hero editorial columns stagger reveal on initial load
  gsap.from('.hero-editorial-blocks .editorial-col, .hero-editorial-blocks .editorial-cta', {
    y: 50,
    opacity: 0,
    duration: 1.1,
    stagger: 0.12,
    ease: 'power3.out',
    delay: 0.5
  });

  // Section header entry transitions (fade & slide up)
  const sections = document.querySelectorAll('section');
  sections.forEach((sec) => {
    const title = sec.querySelector('.section-title');
    const num = sec.querySelector('.section-num');
    const desc = sec.querySelector('.section-desc');
    
    if (title) {
      gsap.from(title, {
        scrollTrigger: {
          trigger: sec,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      });
    }
    
    if (num) {
      gsap.from(num, {
        scrollTrigger: {
          trigger: sec,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        },
        y: 20,
        opacity: 0,
        duration: 0.6,
        delay: 0.1,
        ease: 'power2.out'
      });
    }
    
    if (desc) {
      gsap.from(desc, {
        scrollTrigger: {
          trigger: sec,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
        ease: 'power2.out'
      });
    }
  });

  // Services Card Stagger Entrance on Scroll
  gsap.from('.service-card', {
    scrollTrigger: {
      trigger: '#services',
      start: 'top 75%'
    },
    y: 60,
    opacity: 0,
    duration: 1.1,
    stagger: 0.15,
    ease: 'power3.out'
  });

  // Testimonials Pull Quote Reveal
  gsap.from('.testimonial-item', {
    scrollTrigger: {
      trigger: '#testimonials',
      start: 'top 80%'
    },
    x: -50,
    opacity: 0,
    duration: 1.2,
    stagger: 0.3,
    ease: 'power3.out'
  });

  // Tech Cards Drift entrance
  gsap.from('.tech-card', {
    scrollTrigger: {
      trigger: '#tech',
      start: 'top 85%'
    },
    scale: 0.9,
    opacity: 0,
    duration: 0.9,
    stagger: 0.08,
    ease: 'back.out(1.2)'
  });

  // About section entry reveal
  const aboutHeadline = document.querySelector('.about-headline');
  const aboutText = document.querySelector('.about-text');
  if (aboutHeadline && aboutText) {
    gsap.from(aboutHeadline, {
      scrollTrigger: {
        trigger: '#about',
        start: 'top 85%'
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out'
    });
    gsap.from(aboutText, {
      scrollTrigger: {
        trigger: '#about',
        start: 'top 85%'
      },
      y: 30,
      opacity: 0,
      duration: 0.8,
      delay: 0.2,
      ease: 'power2.out'
    });
  }

  // Contact section entry reveal
  const contactTitle = document.querySelector('.contact-hero-title');
  const contactOptions = document.querySelector('.contact-options');
  const contactForm = document.getElementById('contact-form-container');
  if (contactTitle) {
    gsap.from(contactTitle, {
      scrollTrigger: {
        trigger: '#contact',
        start: 'top 85%'
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out'
    });
  }
  if (contactOptions) {
    gsap.from(contactOptions.children, {
      scrollTrigger: {
        trigger: '#contact',
        start: 'top 85%'
      },
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      delay: 0.2,
      ease: 'power2.out'
    });
  }
  if (contactForm) {
    gsap.from(contactForm, {
      scrollTrigger: {
        trigger: '#contact',
        start: 'top 80%'
      },
      y: 50,
      opacity: 0,
      duration: 0.9,
      delay: 0.3,
      ease: 'power2.out'
    });
  }
}
