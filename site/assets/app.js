// Резерв 400: menu, model switch, power calculator, order form, Google Ads conversions.
document.documentElement.classList.add('js');

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const data = (() => { try { return JSON.parse($('#models-data')?.textContent || '[]'); } catch { return []; } })();
const ads = window.SITE_ADS || null;
const gtagEv = (...a) => { if (typeof window.gtag === 'function') window.gtag(...a); };
const conversion = label => { if (ads && label) gtagEv('event', 'conversion', { send_to: `${ads.id}/${label}` }); };
const fmt = n => `${Math.round(n).toLocaleString('uk-UA').replace(/\s/g, ' ')} ₴`;

// ---------------------------------------------------------------- menu (phones)
const menuBtn = $('.menu-btn'), menu = $('#menu');
if (menuBtn && menu) {
  const set = open => { menu.classList.toggle('is-open', open); menuBtn.setAttribute('aria-expanded', String(open)); document.body.style.overflow = open ? 'hidden' : ''; };
  menuBtn.addEventListener('click', () => set(!menu.classList.contains('is-open')));
  menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
}

// ---------------------------------------------------------------- model switch
const sw = $('[data-switch]');
if (sw && data.length) {
  const powerBtns = $$('.power button', sw), bodyBtns = $$('.body-toggle button', sw);
  const panels = $$('[data-model-panel]');
  let kw = Number(sw.dataset.default || 100), body = 'open';
  const has = (k, b) => data.some(p => p.kw === k && p.body === b);
  const show = () => {
    if (!has(kw, body)) body = has(kw, 'open') ? 'open' : 'canopy';
    const p = data.find(m => m.kw === kw && m.body === body);
    powerBtns.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.kw) === kw)));
    bodyBtns.forEach(b => { b.disabled = !has(kw, b.dataset.body); b.setAttribute('aria-pressed', String(b.dataset.body === body)); });
    panels.forEach(el => { el.hidden = el.dataset.modelPanel !== p.sku; });
  };
  powerBtns.forEach(b => b.addEventListener('click', () => { kw = Number(b.dataset.kw); show(); }));
  bodyBtns.forEach(b => b.addEventListener('click', () => { body = b.dataset.body; show(); }));
  show();
}

// ---------------------------------------------------------------- order buttons pick the model in the form
const pickModel = sku => { const sel = $('#f-model'); if (sel && sku) { sel.value = sku; sel.dispatchEvent(new Event('change')); } };
document.addEventListener('click', e => { const a = e.target.closest('[data-order]'); if (a) pickModel(a.dataset.order); });
const fromUrl = new URLSearchParams(location.search).get('model');
if (fromUrl) pickModel(fromUrl);

// ---------------------------------------------------------------- power calculator
const calc = $('[data-calc]');
if (calc && data.length) {
  const range = $('input[type="range"]', calc), out = $('output', calc), motors = $('#c-motors', calc);
  const presets = $$('.presets button', calc), res = $('[data-result]', calc);
  const ladder = [...new Set(data.map(p => p.kw))].sort((a, b) => a - b);
  const pick = k => data.find(p => p.kw === k && p.body === 'open') || data.find(p => p.kw === k);
  const run = () => {
    const peak = Number(range.value);
    out.firstChild.nodeValue = String(peak);
    const need = peak * (motors.checked ? 1.5 : 1.25);
    // the smallest model with the reserve; a peak the biggest model still carries gets it, flagged as on the limit
    const kwFit = ladder.find(k => k >= need) || ladder.find(k => k >= peak);
    const load = kwFit ? Math.round((peak / kwFit) * 100) : 100;
    const name = $('[data-r-name]', res), img = $('[data-r-img]', res), text = $('[data-r-text]', res), price = $('[data-r-price]', res), btn = $('[data-r-btn]', res), link = $('[data-r-link]', res);
    res.style.setProperty('--load', `${Math.min(load, 100)}%`);
    $('[data-r-load]', res).textContent = `${load}%`;
    if (!kwFit) {
      name.textContent = 'Понад 200 кВт';
      price.textContent = 'Розрахуємо індивідуально';
      text.textContent = 'Для такого навантаження підберемо рішення під ваш об’єкт. Зателефонуйте або напишіть — розрахунок безкоштовний.';
      img.hidden = true; btn.dataset.order = ''; btn.textContent = 'Замовити розрахунок'; link.hidden = true;
      return;
    }
    const p = pick(kwFit);
    img.hidden = false; img.src = p.img2x; img.alt = p.alt;
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
$$('form[data-order-form]').forEach(form => {
  const status = $('.form__status', form);
  const fields = $$('input, select, textarea', form).filter(el => el.type !== 'hidden');
  const say = t => { status.textContent = t; };
  const check = el => {
    if (el.type === 'tel') el.setCustomValidity(el.value.trim() && el.value.replace(/\D/g, '').length < 10 ? 'short' : '');
    const ok = el.checkValidity();
    const err = el.id && $(`#${el.id}-err`, form);
    el.toggleAttribute('aria-invalid', !ok); if (!ok) el.setAttribute('aria-invalid', 'true');
    if (err) err.hidden = ok;
    return ok;
  };
  fields.forEach(el => el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') check(el); }));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const bad = fields.filter(el => !check(el));
    if (bad.length) { say(bad.length === 1 ? 'Виправте 1 поле.' : `Виправте поля: ${bad.length}.`); bad[0].focus(); return; }
    const fd = new FormData(form);
    const endpoint = (form.dataset.endpoint || '').trim();
    if (!endpoint) {
      // no form service yet: open the visitor's mail app with the request written out
      const body = [`Ім’я: ${fd.get('name')}`, `Телефон: ${fd.get('phone')}`, `Модель: ${form.querySelector('#f-model')?.selectedOptions[0]?.text || ''}`, `Населений пункт: ${fd.get('city') || ''}`, `Що живити: ${fd.get('note') || ''}`].join('\n');
      location.href = `mailto:${form.dataset.mail}?subject=${encodeURIComponent('Заявка на генератор з сайту')}&body=${encodeURIComponent(body)}`;
      say('Відкриваємо вашу пошту з готовим листом. Якщо вона не відкрилась — напишіть нам у Viber чи Telegram або зателефонуйте.');
      return;
    }
    const btn = $('button[type="submit"]', form);
    btn.disabled = true; say('Надсилаємо…');
    try {
      const r = await fetch(endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(r.status);
      form.reset(); say('Заявку прийнято. Менеджер передзвонить на вказаний номер.');
      conversion(ads && ads.lead); gtagEv('event', 'generate_lead', { currency: 'UAH' });
    } catch {
      say('Не надіслано: немає з’єднання. Дані залишились у формі — спробуйте ще раз або зателефонуйте.');
    } finally { btn.disabled = false; }
  });
});

// ---------------------------------------------------------------- calls and messengers count as contacts
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="tel:"], a[data-msg]');
  if (!a) return;
  if (a.href.startsWith('tel:')) { conversion(ads && ads.call); gtagEv('event', 'click_to_call'); }
  else gtagEv('event', 'contact', { method: a.dataset.msg });
});
