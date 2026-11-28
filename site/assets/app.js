// Дизель Резерв: menu, scroll reveals, header state, catalog filter, power calculator, order form, Google Ads.
// Motion rules (DESIGN.md): every animation has a job, ease-out curves, transform and opacity only, and nothing
// moves under prefers-reduced-motion.
document.documentElement.classList.add('js');

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const data = (() => { try { return JSON.parse($('#models-data')?.textContent || '[]'); } catch { return []; } })();
const ads = window.SITE_ADS || null;
const gtagEv = (...a) => { if (typeof window.gtag === 'function') window.gtag(...a); };
const conversion = label => { if (ads && label) gtagEv('event', 'conversion', { send_to: `${ads.id}/${label}` }); };
const fmt = n => `${Math.round(n).toLocaleString('uk-UA').replace(/\s/g, ' ')} ₴`;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)', EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

// ---------------------------------------------------------------- toast: says what just happened
const toast = (() => {
  let el, timer;
  return msg => {
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
      document.body.append(el);
    }
    el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span></span>';
    el.lastChild.textContent = msg;
    el.classList.remove('is-off');
    requestAnimationFrame(() => el.classList.add('is-on'));
    clearTimeout(timer);
    timer = setTimeout(() => { el.classList.add('is-off'); el.classList.remove('is-on'); }, 2800);
  };
})();

// ---------------------------------------------------------------- menu (phones)
const menuBtn = $('.menu-btn'), menu = $('#menu');
if (menuBtn && menu) {
  const set = open => {
    menu.classList.toggle('is-open', open); menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Закрити меню' : 'Меню');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => set(!menu.classList.contains('is-open')));
  menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { set(false); menuBtn.focus(); } });
  matchMedia('(min-width: 761px)').addEventListener('change', e => { if (e.matches) set(false); });
}

// ---------------------------------------------------------------- header: lifts once the page scrolls
const header = $('.site-header');
if (header) {
  let ticking = false;
  const update = () => { header.classList.toggle('is-scrolled', scrollY > 8); ticking = false; };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

// ---------------------------------------------------------------- nav: marks the section on screen
const navLinks = $$('.nav a[href^="#"]');
if (navLinks.length && 'IntersectionObserver' in window) {
  const byId = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));
  const seen = new Map();
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => seen.set(en.target.id, en.isIntersecting ? en.intersectionRatio : 0));
    let best = null, top = 0;
    seen.forEach((r, id) => { if (r > top) { top = r; best = id; } });
    navLinks.forEach(a => a.removeAttribute('aria-current'));
    if (best && byId.get(best)) byId.get(best).setAttribute('aria-current', 'true');
  }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, .25, .5, 1] });
  byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}

// ---------------------------------------------------------------- scroll reveals: each block rises once
if (!calm && 'IntersectionObserver' in window) {
  const groups = [
    ['.section .head', false], ['.catalog > *', true], ['.why > *', true], ['.calc > *', true], ['.split > *', true],
    ['.cards > *', true], ['.table-wrap', false], ['.faq > *', true], ['.contact > *', true], ['.pp__grid > *', true],
    ['.trust__grid > *', true], ['.filters', false],
  ];
  const items = [];
  groups.forEach(([sel, stagger]) => {
    const els = $$(sel).filter(el => !el.closest('.hero'));
    els.forEach((el, i) => {
      if (el.hasAttribute('data-reveal')) return;
      el.setAttribute('data-reveal', '');
      if (stagger) el.style.setProperty('--d', String(Math.min(i % 4, 4)));
      items.push(el);
    });
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  // anything already on screen shows at once; the rest waits for the scroll
  items.forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight * 0.92 && r.bottom > 0) el.classList.add('is-in'); else io.observe(el); });
  document.documentElement.classList.add('reveal-on');
  // a jump to an anchor (or a printed page) never leaves blocks hidden
  addEventListener('beforeprint', () => items.forEach(el => el.classList.add('is-in')));
  addEventListener('hashchange', () => { const t = document.getElementById(location.hash.slice(1)); if (t) $$('[data-reveal]', t).forEach(el => el.classList.add('is-in')); });
}

// ---------------------------------------------------------------- hero: a little depth under the pointer
const heroVisual = $('.hero__visual');
if (heroVisual && finePointer && !calm) {
  const layers = [['.hero__blob', -6], ['.hero__img', 12], ['.float--1', 22], ['.float--2', 18], ['.float--3', 26]]
    .map(([s, k]) => [$(s, heroVisual), k]).filter(([el]) => el);
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
  const loop = () => {
    x += (tx - x) * 0.08; y += (ty - y) * 0.08;   // a soft spring: the layers follow, never jump
    layers.forEach(([el, k]) => { el.style.translate = `${(x * k).toFixed(2)}px ${(y * k).toFixed(2)}px`; });
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(loop) : 0;
  };
  const hero = heroVisual.closest('.hero');
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
    if (!raf) raf = requestAnimationFrame(loop);
  });
  hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
}

// ---------------------------------------------------------------- catalog: filter and sort, cards glide to their places
const filters = $('[data-filters]'), grid = $('.catalog');
if (filters && grid) {
  const cards = $$('.pcard[data-sku]', grid), help = $('.pcard--help', grid);
  const status = $('[data-filter-status]', filters), sortSel = $('[data-sort]', filters);
  let mode = 'all';
  const match = c => mode === 'all' || (mode === 'ats' ? c.dataset.ats === '1' : c.dataset.body === mode);
  const order = {
    kw: (a, b) => a.dataset.kw - b.dataset.kw || a.dataset.price - b.dataset.price,
    'price-asc': (a, b) => a.dataset.price - b.dataset.price,
    'price-desc': (a, b) => b.dataset.price - a.dataset.price,
  };
  const apply = () => {
    const moving = [...cards, help].filter(Boolean);
    const before = new Map(moving.map(el => [el, el.hidden ? null : el.getBoundingClientRect()]));
    const shown = cards.filter(match).sort(order[sortSel.value] || order.kw);
    cards.forEach(c => { c.hidden = !shown.includes(c); });
    shown.forEach(c => grid.insertBefore(c, help || null));
    if (status) status.textContent = `Показано ${shown.length} з ${cards.length}`;
    if (calm) return;
    // FLIP: each card starts where it was and glides to where it is now
    [...shown, help].filter(Boolean).forEach(el => {
      const was = before.get(el), now = el.getBoundingClientRect();
      if (!was) { el.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE_OUT }); return; }
      const dx = was.left - now.left, dy = was.top - now.top;
      if (Math.abs(dx) + Math.abs(dy) > 1) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 420, easing: EASE_IN_OUT });
    });
  };
  $$('[data-filter]', filters).forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.filter;
    $$('[data-filter]', filters).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    apply();
  }));
  sortSel.addEventListener('change', apply);
}

// ---------------------------------------------------------------- "Buy" picks the model in the form and says so
const pickModel = (sku, announce) => {
  const sel = $('#f-model');
  if (!sel || !sku || ![...sel.options].some(o => o.value === sku)) return;
  sel.value = sku; sel.dispatchEvent(new Event('change'));
  if (!announce) return;
  const name = sel.selectedOptions[0].text.split(' — ')[0];
  toast(`${name} — додано в заявку`);
  sel.classList.remove('is-flash');
  setTimeout(() => { sel.classList.add('is-flash'); setTimeout(() => sel.classList.remove('is-flash'), 2000); }, calm ? 0 : 650);
};
document.addEventListener('click', e => { const a = e.target.closest('[data-order]'); if (a && a.dataset.order) pickModel(a.dataset.order, true); });
const fromUrl = new URLSearchParams(location.search).get('model');
if (fromUrl) pickModel(fromUrl, false);

// ---------------------------------------------------------------- power calculator
const calc = $('[data-calc]');
if (calc && data.length) {
  const range = $('input[type="range"]', calc), out = $('output', calc), motors = $('#c-motors', calc);
  const presets = $$('.presets button', calc), res = $('[data-result]', calc), model = $('.result__model', res);
  const ladder = [...new Set(data.map(p => p.kw))].sort((a, b) => a - b);
  const pick = k => data.find(p => p.kw === k && p.body === 'open') || data.find(p => p.kw === k);
  let shownSku = null;
  const run = () => {
    const peak = Number(range.value);
    out.firstChild.nodeValue = String(peak);
    range.style.setProperty('--pct', `${((peak - range.min) / (range.max - range.min)) * 100}%`);
    const need = peak * (motors.checked ? 1.5 : 1.25);
    // the smallest model with the reserve; a peak the biggest model still carries gets it, flagged as on the limit
    const kwFit = ladder.find(k => k >= need) || ladder.find(k => k >= peak);
    const load = kwFit ? Math.round((peak / kwFit) * 100) : 100;
    const name = $('[data-r-name]', res), img = $('[data-r-img]', res), text = $('[data-r-text]', res), price = $('[data-r-price]', res), btn = $('[data-r-btn]', res), link = $('[data-r-link]', res);
    res.style.setProperty('--load', `${Math.min(load, 100)}%`);
    $('[data-r-load]', res).textContent = `${load}%`;
    const sku = kwFit ? pick(kwFit).sku : 'over';
    if (sku !== shownSku && shownSku !== null && !calm) model.animate([{ opacity: .35, filter: 'blur(3px)', transform: 'translateY(4px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 280, easing: EASE_OUT });
    shownSku = sku;
    if (!kwFit) {
      name.textContent = 'Понад 200 кВт';
      price.textContent = 'Розрахуємо індивідуально';
      text.textContent = 'Для такого навантаження підберемо рішення під ваш об’єкт. Зателефонуйте або напишіть — розрахунок безкоштовний.';
      img.hidden = true; btn.dataset.order = ''; btn.textContent = 'Замовити розрахунок'; link.hidden = true;
      return;
    }
    const p = pick(kwFit);
    img.hidden = false; if (img.getAttribute('src') !== p.img2x) { img.src = p.img2x; img.alt = p.alt; }
    name.textContent = p.name; price.textContent = `${fmt(p.price)} · ${p.stockText.toLowerCase()}`;
    const zone = load < 30 ? 'Навантаження буде замале: дизель, що довго працює майже без навантаження, закоксовується. Зателефонуйте — підберемо точніше.'
      : load < 50 ? 'Генератор матиме великий запас потужності, зокрема на пускові струми двигунів.'
      : load <= 80 ? 'Генератор працюватиме в оптимальному режимі й матиме запас на пускові струми.'
      : kwFit === ladder[ladder.length - 1] ? 'Модель на межі: запасу на пуск двигунів мало. Зателефонуйте — розрахуємо точно під ваше обладнання.'
      : 'Модель на межі: запасу на пуск двигунів мало. Варто взяти наступну за потужністю.';
    text.textContent = `${zone}${p.ats ? '' : ' АВР до цієї моделі підбираємо окремо.'}`;
    btn.dataset.order = p.sku; btn.textContent = `Замовити ${p.name.split(',')[0]}`;
    link.hidden = false; link.href = p.url;
  };
  presets.forEach(b => b.addEventListener('click', () => {
    presets.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    range.value = b.dataset.kw; run();
  }));
  range.addEventListener('input', () => { presets.forEach(x => x.setAttribute('aria-pressed', 'false')); run(); });
  motors.addEventListener('change', run);
  run();
}

// ---------------------------------------------------------------- order form
// Sends the request as JSON to the form service in data-endpoint (FormSubmit's AJAX URL), which mails it to the
// shop. FormSubmit answers HTTP 200 with {"success": "true" | "false", "message": "..."}. Until the owner clicks
// "Activate Form" in its first email it answers "false" with a message about activation and keeps the request
// (up to 30 days), so the visitor is told it was received.
const SENT = 'Заявку прийнято. Менеджер передзвонить на вказаний номер.';
// a typed number reads back in one shape: 0XX XXX XX XX, or +380 XX XXX XX XX
const tidyPhone = v => {
  const d = v.replace(/\D/g, '');
  if (d.length === 10 && d[0] === '0') return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
  if (d.length === 12 && d.startsWith('380')) return `+380 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
  return v.trim();
};
$$('form[data-order-form]').forEach(form => {
  const status = $('.form__status', form);
  const fields = $$('input, select, textarea', form).filter(el => el.type !== 'hidden' && !el.closest('[data-hp]'));
  const say = t => { status.textContent = t; };
  const phoneEl = $('#f-phone', form);
  if (phoneEl) phoneEl.addEventListener('blur', () => { phoneEl.value = tidyPhone(phoneEl.value); });
  // what the email shows: every named field, a select as its option's words (not the SKU)
  const payload = () => {
    const out = {};
    $$('input[name], select[name], textarea[name]', form).forEach(el => { out[el.name] = (el.matches('select') ? (el.selectedOptions[0]?.text || '') : el.value.trim()).replace(/ /g, ' '); });
    const model = $('#f-model', form), name = $('#f-name', form), phone = $('#f-phone', form);
    const what = model && model.value ? model.selectedOptions[0].text.replace(/ /g, ' ').split(' — ')[0] : 'потрібен підбір';
    if ('_subject' in out) out._subject = `Заявка: ${what} — ${name?.value.trim() || ''}, ${phone?.value.trim() || ''}`;
    if ('_url' in out) out._url = location.href.split('#')[0];
    return out;
  };
  const check = el => {
    if (el.type === 'tel') el.setCustomValidity(el.value.trim() && el.value.replace(/\D/g, '').length < 10 ? 'short' : '');
    const ok = el.checkValidity();
    const err = el.id && $(`#${el.id}-err`, form);
    el.toggleAttribute('aria-invalid', !ok); if (!ok) el.setAttribute('aria-invalid', 'true');
    if (err) err.hidden = ok;
    return ok;
  };
  fields.forEach(el => el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') check(el); }));
  // the confirmation that replaces the form after a real send
  const card = form.parentElement;
  const sent = document.createElement('div');
  sent.className = 'sent'; sent.hidden = true; sent.setAttribute('tabindex', '-1');
  sent.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32"/><path d="m20 33 8 8 16-17"/></svg><h3>Заявку прийнято</h3><p data-sent-text></p><button type="button" class="btn btn--line">Надіслати ще одну заявку</button>';
  form.after(sent);
  $('button', sent).addEventListener('click', () => { sent.hidden = true; sent.classList.remove('is-on'); form.classList.remove('is-hidden'); $('#f-name', form)?.focus(); });
  const showSent = (name, model) => {
    $('[data-sent-text]', sent).textContent = `${name ? `${name}, дякуємо! ` : 'Дякуємо! '}${model ? `Модель: ${model}. ` : ''}Менеджер передзвонить на вказаний номер${card?.dataset.hours ? ` (${card.dataset.hours})` : ''} і порахує все під ваш об’єкт.`;
    form.classList.add('is-hidden'); sent.hidden = false;
    requestAnimationFrame(() => sent.classList.add('is-on'));
    sent.focus({ preventScroll: true });
  };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const bad = fields.filter(el => !check(el));
    if (bad.length) { say(bad.length === 1 ? 'Виправте 1 поле.' : `Виправте поля: ${bad.length}.`); bad[0].focus(); return; }
    const data = payload();
    const who = $('#f-name', form)?.value.trim(), what = $('#f-model', form)?.value ? $('#f-model', form).selectedOptions[0].text.split(' — ')[0] : '';
    if (data._honey) { form.reset(); say(SENT); return; }   // the hidden trap field is filled only by bots
    const endpoint = (form.dataset.endpoint || '').trim();
    if (!endpoint) {
      // no form service: open the visitor's mail app with the request written out
      const body = Object.entries(data).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}: ${v}`).join('\n');
      location.href = `mailto:${form.dataset.mail}?subject=${encodeURIComponent(data._subject || 'Заявка на генератор з сайту')}&body=${encodeURIComponent(body)}`;
      say('Відкриваємо вашу пошту з готовим листом. Якщо вона не відкрилась — напишіть нам у Viber чи Telegram або зателефонуйте.');
      return;
    }
    const btn = $('button[type="submit"]', form);
    btn.disabled = true; btn.classList.add('is-busy'); btn.setAttribute('aria-busy', 'true'); say('Надсилаємо…');
    // the mail service can be slow: say so instead of leaving the visitor guessing
    const slow = setTimeout(() => say('Надсилаємо… Ще кілька секунд, сервіс пошти відповідає повільно.'), 5000);
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
      const res = await r.json().catch(() => ({}));
      const ok = r.ok && String(res.success) === 'true';
      const pending = r.ok && !ok && /activ/i.test(res.message || '');
      if (!ok && !pending) throw new Error(res.message || `HTTP ${r.status}`);
      if (pending) console.warn('FormSubmit: the form is not activated yet. Open the email from FormSubmit and click "Activate Form"; requests sent before that are delivered after activation.');
      form.reset(); say(SENT); showSent(who, what);
      conversion(ads && ads.lead); gtagEv('event', 'generate_lead', { currency: 'UAH' });
    } catch (err) {
      console.warn('Order form:', err && err.message);
      say('Не вдалося надіслати заявку. Дані залишились у формі — спробуйте ще раз, зателефонуйте або напишіть нам у месенджер.');
    } finally { clearTimeout(slow); btn.disabled = false; btn.classList.remove('is-busy'); btn.removeAttribute('aria-busy'); }
  });
});

// ---------------------------------------------------------------- calls and messengers count as contacts
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="tel:"], a[data-msg]');
  if (!a) return;
  if (a.href.startsWith('tel:')) { conversion(ads && ads.call); gtagEv('event', 'click_to_call'); }
  else gtagEv('event', 'contact', { method: a.dataset.msg });
});
