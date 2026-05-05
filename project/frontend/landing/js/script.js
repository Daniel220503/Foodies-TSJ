/**
 * ══════════════════════════════════════════════════
 *  TSJ FOODIES — script.js
 *  Paso 6: Interacciones JS
 *  Paso 7: Formulario de contacto
 *  ──────────────────────────────────────────────
 *  Módulos:
 *   1. Menú móvil (hamburguesa)
 *   2. Scroll suave con offset dinámico
 *   3. Efecto header al hacer scroll
 *   4. Scroll Reveal (IntersectionObserver)
 *   5. FAQ Accordion accesible
 *   6. Validación y envío del formulario
 *   7. Toast / notificación visual
 *   8. Contador de estadísticas animado
 *   9. Tooltip en tarjetas de restaurantes
 * ══════════════════════════════════════════════════
 */

'use strict';

/* ─────────────────────────────────────────────────
   UTILIDADES GLOBALES
───────────────────────────────────────────────── */

/**
 * Selecciona un elemento del DOM de forma segura.
 * @param {string} selector - Selector CSS
 * @param {Element} [ctx=document] - Contexto de búsqueda
 * @returns {Element|null}
 */
const $ = (selector, ctx = document) => ctx.querySelector(selector);

/**
 * Selecciona múltiples elementos del DOM.
 * @param {string} selector - Selector CSS
 * @param {Element} [ctx=document] - Contexto de búsqueda
 * @returns {NodeList}
 */
const $$ = (selector, ctx = document) => ctx.querySelectorAll(selector);

/**
 * Añade un event listener de forma segura (no falla si el elemento no existe).
 * @param {Element|null} el
 * @param {string} event
 * @param {Function} handler
 * @param {Object} [opts]
 */
const on = (el, event, handler, opts = {}) => {
  if (el) el.addEventListener(event, handler, opts);
};

/* ─────────────────────────────────────────────────
   1. MENÚ MÓVIL (HAMBURGUESA)
   Controla apertura/cierre del menú en pantallas
   pequeñas con animación y accesibilidad ARIA.
───────────────────────────────────────────────── */
function initMobileMenu() {
  const toggleBtn = $('.nav-toggle');
  const mainNav   = $('.main-nav');
  if (!toggleBtn || !mainNav) return;

  /**
   * Abre o cierra el menú según el estado actual.
   * @param {boolean} forceClose - Si true, cierra sin toggle
   */
  function setMenuState(forceClose = false) {
    const isOpen = forceClose ? false : !mainNav.classList.contains('open');
    mainNav.classList.toggle('open', isOpen);
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    toggleBtn.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    document.body.style.overflow = isOpen ? 'hidden' : '';

    // Animación de las líneas del ícono hamburguesa
    const lines = $$('.hamburger-line', toggleBtn);
    if (isOpen) {
      lines[0].style.transform = 'translateY(7px) rotate(45deg)';
      lines[1].style.opacity   = '0';
      lines[2].style.transform = 'translateY(-7px) rotate(-45deg)';
    } else {
      lines.forEach(l => { l.style.transform = ''; l.style.opacity = ''; });
    }
  }

  // Click en el botón hamburguesa
  on(toggleBtn, 'click', () => setMenuState());

  // Cierra al hacer click en cualquier link del nav
  $$('.nav-link', mainNav).forEach(link => {
    on(link, 'click', () => setMenuState(true));
  });

  // Cierra al presionar Escape
  on(document, 'keydown', e => {
    if (e.key === 'Escape' && mainNav.classList.contains('open')) {
      setMenuState(true);
      toggleBtn.focus(); // Devuelve el foco al botón
    }
  });

  // Cierra al hacer click fuera del menú
  on(document, 'click', e => {
    if (mainNav.classList.contains('open') &&
        !mainNav.contains(e.target) &&
        !toggleBtn.contains(e.target)) {
      setMenuState(true);
    }
  });
}

/* ─────────────────────────────────────────────────
   2. SCROLL SUAVE CON OFFSET
   Intercepta todos los links con href="#..."
   y aplica scroll suave respetando la altura del header.
───────────────────────────────────────────────── */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(anchor => {
    on(anchor, 'click', e => {
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = $(targetId);
      if (!target) return;

      e.preventDefault();

      // Calcula offset dinámico según la altura real del header
      const header = $('.site-header');
      const offset = header ? header.offsetHeight + 16 : 80;
      const top    = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top, behavior: 'smooth' });

      // Actualiza la URL sin recargar (historial limpio)
      history.pushState(null, '', targetId);

      // Mueve el foco al destino para accesibilidad
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
}

/* ─────────────────────────────────────────────────
   3. EFECTO HEADER AL HACER SCROLL
   Cambia la opacidad y borde del header cuando
   el usuario baja más de 50px.
───────────────────────────────────────────────── */
function initHeaderScroll() {
  const header = $('.site-header');
  if (!header) return;

  let lastY = 0;
  let ticking = false;

  function updateHeader() {
    const scrollY = window.scrollY;

    // Efecto de fondo más sólido
    if (scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Oculta el header al bajar rápido, lo muestra al subir
    if (scrollY > lastY && scrollY > 200) {
      header.classList.add('hidden');
    } else {
      header.classList.remove('hidden');
    }
    lastY = scrollY;
    ticking = false;
  }

  on(window, 'scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });
}

/* ─────────────────────────────────────────────────
   4. SCROLL REVEAL
   Usa IntersectionObserver para revelar elementos
   con animación al entrar al viewport.
   Soporta data-delay para retrasos escalonados.
───────────────────────────────────────────────── */
function initScrollReveal() {
  const elements = $$('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Lee retraso personalizado desde data-delay (en ms)
        const delay = parseInt(entry.target.dataset.delay || '0', 10);
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.10,
    rootMargin: '0px 0px -48px 0px'
  });

  // Asigna retrasos escalonados a grids de cards
  $$('.steps-grid .step-card, .restaurants-grid .rest-card, .benefits-grid .benefit-card, .testimonials-grid .testi-card')
    .forEach((el, i) => {
      el.dataset.delay = String(i * 90);
    });

  elements.forEach(el => observer.observe(el));
}

/* ─────────────────────────────────────────────────
   5. FAQ ACCORDION ACCESIBLE
   Abre/cierra respuestas con animación suave.
   Soporta teclado (Enter/Space) y ARIA completo.
───────────────────────────────────────────────── */
function initFaqAccordion() {
  const items = $$('.faq-item');
  if (!items.length) return;

  /**
   * Cierra un ítem del FAQ.
   * @param {Element} item
   */
  function closeItem(item) {
    const toggle = $('.faq-toggle', item);
    const answer = $('.faq-answer', item);
    if (!toggle || !answer) return;
    toggle.setAttribute('aria-expanded', 'false');
    answer.style.maxHeight = answer.scrollHeight + 'px'; // Para animar desde altura real
    requestAnimationFrame(() => {
      answer.style.maxHeight = '0';
      answer.style.paddingTop    = '0';
      answer.style.paddingBottom = '0';
    });
    setTimeout(() => { answer.hidden = true; answer.style.maxHeight = ''; }, 280);
  }

  /**
   * Abre un ítem del FAQ.
   * @param {Element} item
   */
  function openItem(item) {
    const toggle = $('.faq-toggle', item);
    const answer = $('.faq-answer', item);
    if (!toggle || !answer) return;
    answer.hidden = false;
    answer.style.maxHeight = '0';
    answer.style.paddingTop    = '';
    answer.style.paddingBottom = '';
    toggle.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      answer.style.maxHeight = answer.scrollHeight + 'px';
    });
    setTimeout(() => { answer.style.maxHeight = ''; }, 300);
  }

  items.forEach(item => {
    const toggle = $('.faq-toggle', item);
    if (!toggle) return;

    on(toggle, 'click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';

      // Cierra todos primero
      items.forEach(i => {
        if (i !== item && $('.faq-toggle', i)?.getAttribute('aria-expanded') === 'true') {
          closeItem(i);
        }
      });

      // Toggle del actual
      isOpen ? closeItem(item) : openItem(item);
    });
  });
}

/* ─────────────────────────────────────────────────
   6. VALIDACIÓN Y ENVÍO DEL FORMULARIO
   Paso 7: Valida campos, muestra errores inline
   y simula envío con confirmación visual.
───────────────────────────────────────────────── */
function initContactForm() {
  const form = $('.register-form');
  if (!form) return;

  // Reglas de validación por campo
  const RULES = {
    'reg-nombre': {
      required: true,
      minLength: 3,
      label: 'Nombre completo',
      test: v => v.trim().split(' ').length >= 2,
      errorMsg: 'Ingresa tu nombre y apellido.'
    },
    'reg-email': {
      required: true,
      label: 'Correo institucional',
      test: v => /^[^\s@]+@tsj\.edu\.mx$/i.test(v.trim()),
      errorMsg: 'Usa tu correo institucional @tsj.edu.mx'
    },
    'reg-password': {
      required: true,
      label: 'Contraseña',
      test: v => v.length >= 6,
      errorMsg: 'La contraseña debe tener al menos 6 caracteres.'
    }
  };

  /**
   * Muestra un error debajo del input.
   * @param {Element} input
   * @param {string} msg
   */
  function showError(input, msg) {
    input.classList.add('input-error');
    input.setAttribute('aria-invalid', 'true');
    let errEl = input.parentElement.querySelector('.field-error');
    if (!errEl) {
      errEl = document.createElement('span');
      errEl.className = 'field-error';
      errEl.setAttribute('role', 'alert');
      errEl.setAttribute('aria-live', 'polite');
      input.parentElement.appendChild(errEl);
    }
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }

  /**
   * Limpia el error de un input.
   * @param {Element} input
   */
  function clearError(input) {
    input.classList.remove('input-error');
    input.removeAttribute('aria-invalid');
    const errEl = input.parentElement.querySelector('.field-error');
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
  }

  /**
   * Valida un campo individual.
   * @param {Element} input
   * @returns {boolean}
   */
  function validateField(input) {
    const rule = RULES[input.id];
    if (!rule) return true;
    const val = input.value;
    if (rule.required && !val.trim()) {
      showError(input, `El campo "${rule.label}" es obligatorio.`);
      return false;
    }
    if (!rule.test(val)) {
      showError(input, rule.errorMsg);
      return false;
    }
    clearError(input);
    return true;
  }

  // Validación en tiempo real al salir del campo
  Object.keys(RULES).forEach(id => {
    const input = $(`#${id}`, form);
    if (!input) return;
    on(input, 'blur', () => validateField(input));
    on(input, 'input', () => {
      if (input.classList.contains('input-error')) validateField(input);
    });
  });

  // Submit
  on(form, 'submit', async e => {
    e.preventDefault();

    // Valida todos los campos
    let isValid = true;
    Object.keys(RULES).forEach(id => {
      const input = $(`#${id}`, form);
      if (input && !validateField(input)) isValid = false;
    });
    if (!isValid) {
      // Mueve el foco al primer campo con error
      const firstError = form.querySelector('.input-error');
      if (firstError) firstError.focus();
      return;
    }

    // Simula envío (Paso 7: sin backend)
    const submitBtn = form.querySelector('[type="submit"]');
    if (!submitBtn) return;

    // Estado de carga
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Creando cuenta...';
    submitBtn.classList.add('loading');

    // Simula latencia de red (1.2 segundos)
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Muestra confirmación visual
    showSuccessState(form, submitBtn, originalText);
  });
}

/**
 * Muestra el estado de éxito del formulario.
 * Reemplaza el form con un mensaje de confirmación animado.
 * @param {Element} form
 * @param {Element} btn
 * @param {string} originalBtnText
 */
function showSuccessState(form, btn, originalBtnText) {
  const card = form.closest('.register-card');
  if (!card) { showToast('¡Cuenta creada! Redirigiendo...', 'success'); return; }

  // Anima la salida del formulario
  form.style.transition = 'opacity 0.3s, transform 0.3s';
  form.style.opacity    = '0';
  form.style.transform  = 'translateY(-10px)';

  setTimeout(() => {
    form.style.display = 'none';

    // Crea y muestra el mensaje de éxito
    const success = document.createElement('div');
    success.className = 'success-message';
    success.setAttribute('role', 'status');
    success.setAttribute('aria-live', 'polite');
    success.innerHTML = `
      <div class="success-icon">🎉</div>
      <h3 class="success-title">¡Cuenta creada con éxito!</h3>
      <p class="success-sub">Redirigiendo a la plataforma en <span id="countdown">3</span>s...</p>
      <a href="/login.html" class="btn btn-primary btn-full" style="margin-top:1.25rem;">
        Ir a TSJ Foodies →
      </a>
    `;
    card.appendChild(success);

    // Cuenta regresiva para redirección
    let count = 3;
    const countEl = success.querySelector('#countdown');
    const timer = setInterval(() => {
      count--;
      if (countEl) countEl.textContent = String(count);
      if (count <= 0) {
        clearInterval(timer);
        window.location.href = '/login.html';
      }
    }, 1000);

    // Anima la entrada del mensaje
    requestAnimationFrame(() => {
      success.style.opacity   = '0';
      success.style.transform = 'translateY(10px)';
      success.style.transition = 'opacity 0.4s, transform 0.4s';
      requestAnimationFrame(() => {
        success.style.opacity   = '1';
        success.style.transform = 'translateY(0)';
      });
    });
  }, 300);

  showToast('¡Bienvenido a TSJ Foodies! 🍔', 'success');
}

/* ─────────────────────────────────────────────────
   7. TOAST / NOTIFICACIÓN VISUAL
   Muestra mensajes temporales no intrusivos
   en la esquina inferior derecha.
───────────────────────────────────────────────── */

/**
 * Muestra una notificación tipo toast.
 * @param {string} message - Texto del mensaje
 * @param {'success'|'error'|'info'} type - Tipo visual
 * @param {number} [duration=4000] - Duración en ms
 */
function showToast(message, type = 'info', duration = 4000) {
  // Crea el contenedor si no existe
  let container = $('#toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type]}</span>
    <span class="toast-text">${message}</span>
    <button class="toast-close" aria-label="Cerrar notificación">✕</button>
  `;

  container.appendChild(toast);

  // Fuerza reflow para activar la transición
  requestAnimationFrame(() => toast.classList.add('show'));

  // Botón de cierre
  const closeBtn = toast.querySelector('.toast-close');
  on(closeBtn, 'click', () => dismissToast(toast));

  // Auto-cierre
  const autoClose = setTimeout(() => dismissToast(toast), duration);
  toast.dataset.timer = String(autoClose);
}

/**
 * Cierra y elimina un toast con animación.
 * @param {Element} toast
 */
function dismissToast(toast) {
  clearTimeout(Number(toast.dataset.timer));
  toast.classList.remove('show');
  toast.classList.add('hide');
  setTimeout(() => toast.remove(), 350);
}

/* ─────────────────────────────────────────────────
   8. CONTADOR ANIMADO DE ESTADÍSTICAS
   Anima los números del hero cuando entran
   al viewport usando IntersectionObserver.
───────────────────────────────────────────────── */
function initCounters() {
  // Solo aplicar a elementos con data-count
  const counters = $$('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 1400; // ms
      const steps  = 60;
      const step   = target / steps;
      let current  = 0;

      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = Math.round(current) + suffix;
        if (current >= target) clearInterval(timer);
      }, duration / steps);

      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

/* ─────────────────────────────────────────────────
   9. MICRO-INTERACCIONES EN CARDS DE RESTAURANTES
   Efecto de "tilt" sutil al mover el mouse sobre
   las tarjetas de restaurantes.
───────────────────────────────────────────────── */
function initCardTilt() {
  // Solo en dispositivos con mouse (no touch)
  if (window.matchMedia('(hover: none)').matches) return;

  $$('.rest-card').forEach(card => {
    on(card, 'mousemove', e => {
      const rect   = card.getBoundingClientRect();
      const x      = e.clientX - rect.left;
      const y      = e.clientY - rect.top;
      const midX   = rect.width  / 2;
      const midY   = rect.height / 2;
      const rotX   = ((y - midY) / midY) * -5;  // Max ±5deg
      const rotY   = ((x - midX) / midX) *  5;
      card.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-5px)`;
    });

    on(card, 'mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.4s ease';
    });
    on(card, 'mouseenter', () => {
      card.style.transition = 'transform 0.1s ease';
    });
  });
}

/* ─────────────────────────────────────────────────
   10. MARCAR LINK ACTIVO EN NAV AL HACER SCROLL
   Resalta el link del menú correspondiente a la
   sección visible en pantalla.
───────────────────────────────────────────────── */
function initActiveNavLink() {
  const sections = $$('section[id], main[id]');
  const navLinks = $$('.nav-link');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    });
  }, { threshold: 0.4, rootMargin: '-80px 0px 0px 0px' });

  sections.forEach(s => observer.observe(s));
}

/* ─────────────────────────────────────────────────
   INICIALIZACIÓN PRINCIPAL
   Se ejecuta cuando el DOM está listo.
───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initSmoothScroll();
  initHeaderScroll();
  initScrollReveal();
  initFaqAccordion();
  initContactForm();
  initCounters();
  initCardTilt();
  initActiveNavLink();
});
