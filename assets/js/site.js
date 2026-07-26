(() => {
  document.documentElement.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#site-nav');
  const progress = document.querySelector('.scroll-progress span');

  navToggle?.addEventListener('click', () => {
    const open = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!open));
    nav?.classList.toggle('is-open', !open);
  });

  nav?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav?.classList.remove('is-open');
      navToggle?.setAttribute('aria-expanded', 'false');
    });
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    nav?.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
  });

  const updateProgress = () => {
    if (!progress) return;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const value = height > 0 ? (window.scrollY / height) * 100 : 0;
    progress.style.width = `${Math.min(100, Math.max(0, value))}%`;
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });

  const glow = document.querySelector('.cursor-glow');
  if (glow && finePointer && !reduceMotion) {
    window.addEventListener('pointermove', (event) => {
      glow.style.setProperty('--x', `${event.clientX}px`);
      glow.style.setProperty('--y', `${event.clientY}px`);
    }, { passive: true });
  }

  const canvas = document.querySelector('.space-canvas');
  if (canvas) {
    const context = canvas.getContext('2d');
    const pointer = { x: 0, y: 0, active: false };
    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let frame = 0;
    let running = !reduceMotion;

    const particleCount = () => {
      if (reduceMotion) return 30;
      if (width < 430) return 42;
      if (width < 820) return 58;
      return 86;
    };

    const buildNodes = () => {
      const count = particleCount();
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() > 0.84 ? 1.55 : 1,
        glow: Math.random() > 0.86,
      }));
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNodes();
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      nodes.forEach((node) => {
        if (!reduceMotion) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < -18) node.x = width + 18;
          if (node.x > width + 18) node.x = -18;
          if (node.y < -18) node.y = height + 18;
          if (node.y > height + 18) node.y = -18;
        }

        context.beginPath();
        context.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        context.fillStyle = node.glow ? 'rgba(255, 216, 107, 0.78)' : 'rgba(125, 255, 207, 0.62)';
        context.shadowBlur = node.glow ? 14 : 8;
        context.shadowColor = node.glow ? 'rgba(255, 216, 107, 0.6)' : 'rgba(125, 255, 207, 0.5)';
        context.fill();
        context.shadowBlur = 0;
      });

      const limit = width < 520 ? 92 : 124;
      for (let index = 0; index < nodes.length; index += 1) {
        for (let next = index + 1; next < nodes.length; next += 1) {
          const a = nodes[index];
          const b = nodes[next];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          if (distance > limit) continue;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.strokeStyle = `rgba(125, 255, 207, ${(1 - distance / limit) * 0.16})`;
          context.lineWidth = 1;
          context.stroke();
        }
      }

      if (pointer.active && finePointer) {
        nodes.forEach((node) => {
          const dx = node.x - pointer.x;
          const dy = node.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 170) return;
          context.beginPath();
          context.moveTo(pointer.x, pointer.y);
          context.lineTo(node.x, node.y);
          context.strokeStyle = `rgba(255, 216, 107, ${(1 - distance / 170) * 0.26})`;
          context.lineWidth = 1;
          context.stroke();
        });
      }

      if (running) frame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    if (reduceMotion) window.cancelAnimationFrame(frame);

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    }, { passive: true });
    window.addEventListener('pointerleave', () => {
      pointer.active = false;
    });
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden && !reduceMotion;
      if (running) draw();
      if (!running) window.cancelAnimationFrame(frame);
    });
  }

  const revealCards = document.querySelectorAll('.reveal-card');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealCards.forEach((card) => card.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    revealCards.forEach((card, index) => {
      card.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
      observer.observe(card);
    });
  }

  const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const activeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        navLinks.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === id));
      });
    }, { threshold: 0.32, rootMargin: '-18% 0px -58% 0px' });

    sections.forEach((section) => activeObserver.observe(section));
  }

  const typeOutputs = document.querySelectorAll('.typed-output');
  const typeLine = (element) => {
    if (element.dataset.done === 'true') return;
    element.dataset.done = 'true';
    const text = element.getAttribute('data-text') || element.textContent || '';
    if (reduceMotion) {
      element.textContent = text;
      return;
    }
    element.textContent = '';
    element.classList.add('is-typing');
    let index = 0;
    const tick = () => {
      element.textContent = text.slice(0, index);
      index += 1;
      if (index <= text.length) {
        window.setTimeout(tick, 16 + Math.random() * 22);
      } else {
        element.classList.remove('is-typing');
      }
    };
    tick();
  };

  if ('IntersectionObserver' in window) {
    const terminalObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const lines = entry.target.querySelectorAll('.typed-output');
        lines.forEach((line, index) => window.setTimeout(() => typeLine(line), index * 230));
        terminalObserver.unobserve(entry.target);
      });
    }, { threshold: 0.42 });
    document.querySelectorAll('.terminal-window').forEach((terminal) => terminalObserver.observe(terminal));
  } else {
    typeOutputs.forEach(typeLine);
  }

  if (finePointer && !reduceMotion) {
    const tiltCards = document.querySelectorAll('.interactive-card, .command-deck');
    tiltCards.forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) - 0.5;
        const y = ((event.clientY - rect.top) / rect.height) - 0.5;
        card.style.setProperty('--ry', `${x * 5}deg`);
        card.style.setProperty('--rx', `${y * -4}deg`);
        card.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
        card.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--gx', '50%');
        card.style.setProperty('--gy', '50%');
      });
    });

    const magnets = document.querySelectorAll('.magnetic');
    magnets.forEach((element) => {
      element.addEventListener('pointermove', (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.16;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.16;
        element.style.setProperty('--mx', `${x}px`);
        element.style.setProperty('--my', `${y}px`);
      });
      element.addEventListener('pointerleave', () => {
        element.style.setProperty('--mx', '0px');
        element.style.setProperty('--my', '0px');
      });
    });
  }


  const interactiveTargets = document.querySelectorAll('.interactive-card, .command-deck, .btn, .deck-actions a, .service-card a, .social-list a, .site-nav a');
  interactiveTargets.forEach((target) => {
    target.addEventListener('pointerdown', (event) => {
      const rect = target.getBoundingClientRect();
      target.classList.add('is-pressed');
      target.style.setProperty('--ripple-x', `${event.clientX - rect.left}px`);
      target.style.setProperty('--ripple-y', `${event.clientY - rect.top}px`);

      if (!reduceMotion) {
        const ripple = document.createElement('i');
        ripple.className = 'ripple-dot';
        ripple.style.setProperty('--ripple-x', `${event.clientX - rect.left}px`);
        ripple.style.setProperty('--ripple-y', `${event.clientY - rect.top}px`);
        target.appendChild(ripple);
        window.setTimeout(() => ripple.remove(), 760);
      }
    });

    ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach((eventName) => {
      target.addEventListener(eventName, () => target.classList.remove('is-pressed'));
    });
  });

  const copyButton = document.querySelector('[data-copy-email]');
  copyButton?.addEventListener('click', async () => {
    const email = copyButton.getAttribute('data-copy-email') || '';
    const original = copyButton.textContent;
    try {
      await navigator.clipboard.writeText(email);
      copyButton.textContent = 'Email tersalin';
    } catch (error) {
      copyButton.textContent = email;
    }
    window.setTimeout(() => {
      copyButton.textContent = original;
    }, 1800);
  });
})();
