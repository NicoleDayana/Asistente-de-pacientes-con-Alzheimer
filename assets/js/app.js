/* Interfaz: reloj, recordatorios, modo letra grande y navegación. */

(() => {
  'use strict';

  const STORAGE_KEY = 'assist-alzheimer:recordatorios';
  const TEXT_KEY = 'assist-alzheimer:letra-grande';
  const root = document.documentElement;

  /* ---------- Utilidades ---------------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const safeStorage = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch { /* modo privado */ }
    },
    remove(key) {
      try { window.localStorage.removeItem(key); } catch { /* modo privado */ }
    },
  };

  let toastTimer;
  function toast(message, duration = 3200) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => { el.hidden = true; }, 400);
    }, duration);
  }

  const pad = (n) => String(n).padStart(2, '0');

  const prefers = (query) =>
    typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false;

  const formatterDate = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

  function greetingFor(hour) {
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  /* ---------- Reloj --------------------------------------- */
  const heroClock = $('#heroClock');
  const demoClock = $('#demoClock');
  const demoDate = $('#demoDate');
  const demoGreeting = $('#demoGreeting');

  function tickClock() {
    const now = new Date();
    const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (heroClock) heroClock.textContent = hhmm;
    if (demoClock) demoClock.textContent = hhmm;
    if (demoDate) {
      const label = formatterDate.format(now);
      demoDate.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    }
    if (demoGreeting) demoGreeting.textContent = `${greetingFor(now.getHours())}, Ana`;
  }
  tickClock();
  setInterval(tickClock, 15000);

  /* ---------- Recordatorios ------------------------------- */
  const DEFAULT_REMINDERS = [
    { id: 'demo-1', title: 'Tomar la pastilla azul', time: '08:00', done: true },
    { id: 'demo-2', title: 'Caminar 15 minutos en el parque', time: '10:30', done: false },
    { id: 'demo-3', title: 'Almorzar con Laura', time: '13:00', done: false },
  ];

  const listEl = $('#reminderList');
  const countEl = $('#reminderCount');
  const nextTitle = $('#nextReminder .next-title');
  const nextTime = $('#nextReminder .next-time');
  const form = $('#reminderForm');
  const titleInput = $('#reminderTitle');
  const timeInput = $('#reminderTime');

  let reminders = loadReminders();

  function loadReminders() {
    const raw = safeStorage.get(STORAGE_KEY);
    if (!raw) return structuredCloneSafe(DEFAULT_REMINDERS);
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return structuredCloneSafe(DEFAULT_REMINDERS);
      return parsed
        .filter((item) => item && typeof item.title === 'string' && typeof item.time === 'string')
        .map((item, index) => ({
          id: item.id || `r-${index}-${Date.now()}`,
          title: item.title.slice(0, 60),
          time: normalizeTime(item.time),
          done: Boolean(item.done),
        }))
        .sort(byTime);
    } catch {
      return structuredCloneSafe(DEFAULT_REMINDERS);
    }
  }

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeTime(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
    if (!match) return '09:00';
    const h = Math.min(23, Math.max(0, Number(match[1])));
    const m = Math.min(59, Math.max(0, Number(match[2])));
    return `${pad(h)}:${pad(m)}`;
  }

  function byTime(a, b) {
    return a.time.localeCompare(b.time);
  }

  function saveReminders() {
    safeStorage.set(STORAGE_KEY, JSON.stringify(reminders));
  }

  function formatTime12(time) {
    const [h, m] = time.split(':').map(Number);
    const suffix = h >= 12 ? 'p. m.' : 'a. m.';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${pad(m)} ${suffix}`;
  }

  function renderReminders() {
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!reminders.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'Aún no hay recordatorios. Añade el primero con el formulario.';
      listEl.appendChild(empty);
    } else {
      reminders.forEach((reminder) => {
        const li = document.createElement('li');
        li.className = `reminder-item${reminder.done ? ' is-done' : ''}`;
        li.dataset.id = reminder.id;

        const check = document.createElement('button');
        check.type = 'button';
        check.className = 'reminder-check';
        check.setAttribute('aria-pressed', String(reminder.done));
        check.setAttribute('aria-label', `${reminder.done ? 'Desmarcar' : 'Marcar como hecho'}: ${reminder.title}`);
        check.textContent = '✓';
        check.addEventListener('click', () => toggleReminder(reminder.id));

        const body = document.createElement('div');
        body.className = 'reminder-body';

        const title = document.createElement('span');
        title.className = 'reminder-title';
        title.textContent = reminder.title;

        const time = document.createElement('span');
        time.className = 'reminder-time';
        const ampm = formatTime12(reminder.time).replace(/^\d{1,2}:\d{2}\s*/, '');
        time.textContent = `${reminder.time} (${ampm})`;

        body.append(title, time);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'reminder-delete';
        remove.setAttribute('aria-label', `Eliminar recordatorio: ${reminder.title}`);
        remove.textContent = '✕';
        remove.addEventListener('click', () => deleteReminder(reminder.id));

        li.append(check, body, remove);
        listEl.appendChild(li);
      });
    }

    const pending = reminders.filter((item) => !item.done).length;
    if (countEl) {
      countEl.textContent = pending === 1 ? '1 pendiente' : `${pending} pendientes`;
    }

    renderNextReminder();
  }

  function renderNextReminder() {
    if (!nextTitle || !nextTime) return;
    const card = nextTitle.closest('.next-reminder');
    const label = card?.querySelector('.next-label');
    const pending = reminders.filter((item) => !item.done).sort(byTime);

    card?.classList.toggle('is-empty', pending.length === 0);
    if (label) label.textContent = pending.length ? 'Siguiente recordatorio' : 'Todo al día';

    if (!pending.length) {
      nextTitle.textContent = reminders.length ? '¡Todo listo por hoy!' : 'Añade tu primer recordatorio';
      nextTime.textContent = reminders.length
        ? 'Marca nuevos recordatorios cuando quieras'
        : 'Usa el panel de la derecha';
      return;
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const upcoming = pending.find((item) => {
      const [h, m] = item.time.split(':').map(Number);
      return h * 60 + m >= nowMinutes;
    }) || pending[0];

    nextTitle.textContent = upcoming.title;
    nextTime.textContent = formatTime12(upcoming.time);
  }

  function toggleReminder(id) {
    reminders = reminders.map((item) => (item.id === id ? { ...item, done: !item.done } : item));
    saveReminders();
    renderReminders();
    const current = reminders.find((item) => item.id === id);
    if (current?.done) toast(`Listo: «${current.title}» marcado como hecho.`);
  }

  function deleteReminder(id) {
    const item = reminders.find((entry) => entry.id === id);
    reminders = reminders.filter((entry) => entry.id !== id);
    saveReminders();
    renderReminders();
    if (item) toast(`Eliminado: «${item.title}».`);
  }

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = (titleInput?.value || '').trim();
    const time = normalizeTime(timeInput?.value || '');
    if (!title) {
      titleInput?.focus();
      toast('Escribe el nombre del recordatorio.');
      return;
    }

    reminders = reminders
      .concat({
        id: `r-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
        title: title.slice(0, 60),
        time,
        done: false,
      })
      .sort(byTime);

    saveReminders();
    renderReminders();
    form.reset();
    if (timeInput) timeInput.value = nextHourValue();
    titleInput?.focus();
    toast(`Recordatorio guardado para las ${formatTime12(time)}.`);
  });

  // Valor inicial de la hora: siguiente hora en punto.
  function nextHourValue() {
    const now = new Date();
    return `${pad((now.getHours() + 1) % 24)}:00`;
  }
  if (timeInput) timeInput.value = nextHourValue();

  renderReminders();

  /* ---------- Acciones del dispositivo -------------------- */
  const overlay = $('#deviceOverlay');
  const overlayEyebrow = $('#overlayEyebrow');
  const overlayTitle = $('#overlayTitle');
  const overlayText = $('#overlayText');
  const overlayClose = $('#overlayClose');
  let lastFocused = null;

  function openOverlay({ eyebrow, title, text }) {
    if (!overlay) return;
    lastFocused = document.activeElement;
    if (overlayEyebrow) overlayEyebrow.textContent = eyebrow;
    if (overlayTitle) overlayTitle.textContent = title;
    if (overlayText) overlayText.textContent = text;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    overlayClose?.focus();
  }

  function closeOverlay() {
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove('is-open');
    setTimeout(() => { overlay.hidden = true; }, 250);
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
  }

  overlayClose?.addEventListener('click', closeOverlay);
  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) closeOverlay();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay && !overlay.hidden) closeOverlay();
  });

  $('#btnCall')?.addEventListener('click', () => {
    openOverlay({
      eyebrow: 'Llamada de demostración',
      title: 'Llamando a María, tu cuidadora',
      text: 'En el brazalete real se marca automáticamente al contacto principal. Esta demo no realiza llamadas.',
    });
  });

  $('#btnWhere')?.addEventListener('click', () => {
    openOverlay({
      eyebrow: 'Estás en un lugar seguro',
      title: 'Casa · Carrera 15 #93-40, Bogotá',
      text: 'Tu cuidadora María está a 10 minutos. Si necesitas ayuda, pulsa «Llamar a mi cuidador».',
    });
  });

  $('#btnRepeat')?.addEventListener('click', () => {
    const pending = reminders.filter((item) => !item.done).sort(byTime)[0];
    openOverlay({
      eyebrow: 'Repetición en voz alta',
      title: pending ? pending.title : 'No hay indicaciones pendientes',
      text: pending
        ? `Tu próximo recordatorio es a las ${formatTime12(pending.time)}. Repetiremos el mensaje con la voz de tu cuidadora.`
        : 'Puedes pedir que se repita la última indicación en cualquier momento.',
    });
  });

  $('#btnDemoReset')?.addEventListener('click', () => {
    safeStorage.remove(STORAGE_KEY);
    reminders = structuredCloneSafe(DEFAULT_REMINDERS);
    saveReminders();
    renderReminders();
    toast('Demostración reiniciada con los recordatorios de ejemplo.');
  });

  /* ---------- Modo letra grande --------------------------- */
  const textToggle = $('#textToggle');

  function applyTextMode(enabled) {
    root.dataset.theme = enabled ? 'grande' : 'claro';
    textToggle?.setAttribute('aria-pressed', String(enabled));
    const label = $('.text-toggle-label', textToggle || document);
    if (label) label.textContent = enabled ? 'Letra normal' : 'Letra grande';
  }

  applyTextMode(safeStorage.get(TEXT_KEY) === 'true');

  textToggle?.addEventListener('click', () => {
    const enabled = textToggle.getAttribute('aria-pressed') !== 'true';
    applyTextMode(enabled);
    safeStorage.set(TEXT_KEY, String(enabled));
    toast(enabled ? 'Letra grande activada (125 %).' : 'Tamaño de letra normal.');
  });

  /* ---------- Navegación activa --------------------------- */
  const navLinks = $$('.site-nav a');
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            const active = link.getAttribute('href') === `#${entry.target.id}`;
            if (active) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach((section) => navObserver.observe(section));
  }

  /* ---------- Aparición al hacer scroll ------------------- */
  const revealTargets = $$('.card, .viewer-shell, .panel-block, .acc-item, .tech-card, .device');
  revealTargets.forEach((el) => el.classList.add('reveal'));

  if ('IntersectionObserver' in window && !prefers('(prefers-reduced-motion: reduce)')) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    revealTargets.forEach((el) => revealObserver.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  }
})();
