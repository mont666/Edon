#!/usr/bin/env node
// Builds the Дизель Резерв site from data/products.json and data/site.json into site/.
//   node tools/build.mjs
// Every page (home, a page per generator, buyer pages, 404) comes from the templates below, so the header,
// footer, contacts and order form are the same everywhere. Also writes robots.txt and llms.txt, and once
// data/site.json has a domain, sitemap.xml and the Google Merchant Center feed.
// Empty fields in site.json are left off the pages; the build lists every one Google Ads needs.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const products = JSON.parse(readFileSync(join(ROOT, 'data/products.json'), 'utf8'));
const cfg = JSON.parse(readFileSync(join(ROOT, 'data/site.json'), 'utf8'));
const ICONS = JSON.parse(readFileSync(join(ROOT, 'tools/icon-paths.json'), 'utf8'));
const YEAR = new Date().getFullYear();
// cache-busting: the CDN and browsers keep assets for a week, so each asset URL carries a hash of its content
const ver = f => createHash('sha1').update(readFileSync(join(SITE, f))).digest('hex').slice(0, 10);
const CSS_V = ver('assets/app.css'), JS_V = ver('assets/app.js');
const TODAY = new Date().toISOString().slice(0, 10);
const domain = (cfg.domain || '').replace(/\/+$/, '');
const abs = p => (domain ? `${domain}/${p}` : '');

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nb = s => String(s).replace(/ /g, ' ');
const price = n => `${Math.round(n).toLocaleString('uk-UA').replace(/\s/g, ' ')} ₴`;
const plain = s => s.replace(/ /g, ' ');
const byPower = [...products].sort((a, b) => a.kw - b.kw || (a.body === 'open' ? -1 : 1));
const minPrice = Math.min(...products.map(p => p.price));
const IMG_SIZE = {
  'edon-50-kvt-vidkryta-rama': [478, 281], 'edon-50-kvt-u-kozhusi': [500, 264], 'edon-100-kvt-vidkryta-rama': [488, 309],
  'edon-100-kvt-u-kozhusi': [500, 264], 'edon-150-kvt-vidkryta-rama': [488, 309], 'edon-200-kvt-vidkryta-rama': [493, 267],
  'edon-gj-30gf-30-kvt': [537, 413],
};
const vtName = p => `gen-${p.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
const imgTag = (p, pre, { cls = '', lazy = true, sizes = '(max-width: 1023px) 92vw, 640px', priority = false, vt = false } = {}) => {
  const [w, h] = IMG_SIZE[p.image] || [500, 300];
  const base = `${pre}assets/img/products/${p.image}`;
  return `<img${cls ? ` class="${cls}"` : ''} src="${base}-2x.webp" srcset="${base}-240.webp 240w, ${base}.webp ${w}w, ${base}-2x.webp ${w * 2}w" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(p.alt)}"${lazy ? ' loading="lazy"' : ''}${priority ? ' fetchpriority="high"' : ''} decoding="async"${vt ? ` style="view-transition-name:${vtName(p)}"` : ''}>`;
};
const bodyName = p => (p.body === 'canopy' ? 'шумозахисний кожух' : 'відкрита рама');
const stockText = p => (p.stock === 'in_stock' ? 'На складі' : 'Під замовлення');
const digits = (cfg.phone || '').replace(/[^\d+]/g, '');
const telHref = `tel:${digits}`;
const phoneShown = cfg.phoneDisplay || cfg.phone;

// ---------------------------------------------------------------- icons and contacts
const icon = (name, cls = '') => {
  if (ICONS[name]) return `<svg class="ic-${name} ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${ICONS[name]}"/></svg>`;
  const ui = {
    phone: '<path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    sms: '<path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    arrow: '<path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    menu: '<path class="l1" d="M4 8h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="l2" d="M4 16h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    truck: '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="17.5" r="1.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="17" cy="17.5" r="1.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    power: '<path d="M12 3v8M7 6.3a7 7 0 1 0 10 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    users: '<circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 20a6 6 0 0 1 12 0M16 5.2a3 3 0 0 1 0 5.6M18 14.5a5 5 0 0 1 3 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    shield: '<path d="M12 3 5 6v5c0 4.6 3 8.4 7 10 4-1.6 7-5.4 7-10V6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    cash: '<rect x="2.5" y="6" width="19" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 9.5v5M18 9.5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3M8 18h.01M12 18h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    store: '<path d="M4 9.5 5.5 4h13L20 9.5M4 9.5V20h16V9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    check: '<path d="m5 12.5 4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  }[name];
  return `<svg class="ic-${name} ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ui}</svg>`;
};
const MSG = {
  viber: ['Viber', `viber://chat?number=%2B${digits.replace('+', '')}`],
  telegram: ['Telegram', `https://t.me/${digits}`],
  whatsapp: ['WhatsApp', `https://wa.me/${digits.replace('+', '')}`],
  sms: ['SMS', `sms:${digits}`],
};
const messengers = () => (cfg.phone ? `<div class="chips">${(cfg.messengers || []).map(m => MSG[m] ? `<a class="chip" href="${MSG[m][1]}" data-msg="${m}"${m === 'telegram' || m === 'whatsapp' ? ' target="_blank" rel="noopener"' : ''}>${icon(m)}${MSG[m][0]}</a>` : '').join('')}</div>` : '');
const payText = 'на рахунок (без ПДВ) або готівкою';

// ---------------------------------------------------------------- head, header, footer, bar
const FONTS = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&display=swap';
const headHtml = ({ pre, path, title, description, ld, ogImage, robots, ogType }) => {
  const extra = [];
  if (domain) extra.push(`<link rel="canonical" href="${domain}/${path}">`, `<meta property="og:url" content="${domain}/${path}">`);
  if (cfg.googleSiteVerification) extra.push(`<meta name="google-site-verification" content="${esc(cfg.googleSiteVerification)}">`);
  const og = ogImage ? (domain ? `${domain}/${ogImage}` : pre + ogImage) : (domain ? `${domain}/share.jpg` : `${pre}share.jpg`);
  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="uk_UA">
<meta property="og:site_name" content="${esc(cfg.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FFFFFF">
<link rel="icon" href="${pre}favicon.svg" type="image/svg+xml">
<script>document.documentElement.classList.add('js')</script>
${extra.join('\n')}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${pre}assets/app.css?v=${CSS_V}">
${ld ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...ld })}</script>` : ''}
${analytics()}
</head>`;
};

const NAV = [['modeli', 'Моделі'], ['pidbir', 'Підбір потужності'], ['dostavka', 'Доставка'], ['oplata', 'Оплата'], ['pytannia', 'Питання'], ['zamovlennia', 'Контакти']];
const headerHtml = (pre, onIndex) => {
  const a = id => (onIndex ? `#${id}` : `${pre}#${id}`);
  return `<a class="skip" href="#main">Перейти до змісту</a>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="${onIndex ? '#main' : pre || './'}"><span class="logo__mark" aria-hidden="true">ДР</span><span>${esc(cfg.name)}<small>дилер EDON</small></span></a>
    <nav class="nav" aria-label="Головне меню">${NAV.slice(0, 5).map(([id, t]) => `<a href="${a(id)}">${t}</a>`).join('')}</nav>
    <div class="head-actions">
      ${cfg.phone ? `<a class="head-phone" href="${telHref}">${esc(phoneShown)}<small>${esc(cfg.hours || 'дзвінки й месенджери')}</small></a>` : ''}
      <a class="btn btn--amber" href="#zamovlennia">Замовити генератор</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" aria-label="Меню">${icon('menu')}</button>
    </div>
  </div>
</header>
<div class="menu" id="menu">
  <div class="menu__inner">
  ${NAV.map(([id, t], i) => `<a href="${a(id)}" style="--i:${i}">${t}</a>`).join('\n  ')}
  <div class="btn-row" style="--i:${NAV.length}">${cfg.phone ? `<a class="btn btn--amber" href="${telHref}">${icon('phone')}${esc(phoneShown)}</a>` : ''}</div>
  <div style="--i:${NAV.length + 1}">${messengers()}</div>
  </div>
</div>`;
};

const footerHtml = pre => `<footer class="site-footer">
  <div class="wrap">
    <div class="grid">
      <div class="foot-brand">
        <a class="logo" href="${pre || './'}"><span class="logo__mark" aria-hidden="true">ДР</span><span>${esc(cfg.name)}<small>дилер EDON</small></span></a>
        <p>Продаж, доставка й запуск промислових дизельних генераторів EDON 30–200 кВт по всій Україні.</p>
      </div>
      <div><h3>Моделі</h3><ul>${byPower.map(p => `<li><a href="${pre}generatory/${p.slug}/">${esc(p.name)}</a></li>`).join('')}</ul></div>
      <div><h3>Покупцям</h3><ul>
        <li><a href="${pre}dostavka-i-oplata/">Доставка й оплата</a></li>
        <li><a href="${pre}harantiia-ta-povernennia/">Гарантія й повернення</a></li>
        <li><a href="${pre}oferta/">Публічна оферта</a></li>
        <li><a href="${pre}konfidentsiinist/">Політика конфіденційності</a></li>
        <li><a href="${pre}kontakty/">Контакти й реквізити</a></li>
      </ul></div>
      <div><h3>Контакти</h3><ul>
        ${cfg.phone ? `<li><a href="${telHref}">${esc(phoneShown)}</a></li><li>Viber, Telegram, WhatsApp, SMS — на цей номер</li>` : ''}
        ${cfg.email ? `<li><a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></li>` : ''}
        ${cfg.city ? `<li>${esc([cfg.street, cfg.city].filter(Boolean).join(', '))}</li>` : ''}
        ${cfg.hours ? `<li>${esc(cfg.hours)}</li>` : ''}
      </ul></div>
    </div>
    <div class="legal">
      ${cfg.legalName ? `<p>Продавець: ${esc(cfg.legalName)}${cfg.legalCode ? `, РНОКПП ${esc(cfg.legalCode)}` : ''}${cfg.legalAddress ? `, ${esc(cfg.legalAddress)}` : ''}. Ми продаємо генератори EDON як дилер і не є їх виробником.</p>` : '<p>Ми продаємо генератори EDON як дилер і не є їх виробником.</p>'}
      <p>© ${YEAR} ${esc(cfg.name)} · <a href="${pre}konfidentsiinist/">Конфіденційність</a> · <a href="${pre}oferta/">Умови продажу</a> · <a href="${pre}credits/">Джерела фотографій</a></p>
    </div>
  </div>
</footer>
<nav class="bar" aria-label="Швидкий зв’язок">
  ${cfg.phone ? `<a class="btn btn--amber" href="${telHref}">${icon('phone')}Подзвонити</a>` : ''}
  <a class="btn btn--ghost" href="#zamovlennia">Написати</a>
</nav>`;

// ---------------------------------------------------------------- contact + order section (every page)
// The form posts to FormSubmit (data/site.json formEndpoint: its AJAX URL). app.js sends JSON there; without
// JavaScript the browser posts the form to FormSubmit's plain URL, which shows its own check and thank-you
// pages (or the site's /dyakuiemo/ page once a domain is set). Field names are what the email shows.
const formSubmit = /formsubmit\.co/.test(cfg.formEndpoint || '');
const orderForm = (selected, pagePath = '') => {
  const endpoint = cfg.formEndpoint || '';
  const action = endpoint.replace('/ajax/', '/');
  const opts = byPower.map(p => `<option value="${p.sku}"${p.slug === selected ? ' selected' : ''}>${esc(p.name)} — ${price(p.price)}</option>`).join('');
  const hidden = formSubmit ? `
        <input type="hidden" name="_subject" value="Заявка на генератор з сайту ${esc(cfg.name)}">
        <input type="hidden" name="_template" value="table">
        <input type="hidden" name="_url" value="${domain ? `${domain}/${pagePath}` : ''}">
        ${domain ? `<input type="hidden" name="_next" value="${domain}/dyakuiemo/">` : ''}
        <div data-hp hidden><label for="f-hp">Не заповнюйте це поле</label><input id="f-hp" type="text" name="_honey" tabindex="-1" autocomplete="off"></div>` : '';
  return `<form class="form" data-order-form data-endpoint="${esc(endpoint)}" data-mail="${esc(cfg.fallbackEmail || cfg.email || '')}" ${endpoint ? `action="${esc(action)}" method="post"` : ''} novalidate>${hidden}
        <div class="field"><label for="f-name">Ім’я</label><input id="f-name" name="Ім’я" type="text" autocomplete="name" required aria-describedby="f-name-err"><p class="field__err" id="f-name-err" hidden>Напишіть, як до вас звертатися.</p></div>
        <div class="field"><label for="f-phone">Телефон</label><input id="f-phone" name="Телефон" type="tel" autocomplete="tel" inputmode="tel" required minlength="10" aria-describedby="f-phone-err"><p class="field__err" id="f-phone-err" hidden>Номер з кодом оператора, наприклад 0XX XXX XX XX.</p></div>
        <div class="field field--full"><label for="f-model">Модель</label><select id="f-model" name="Модель"><option value="">Ще не знаю — допоможіть підібрати</option>${opts}</select></div>
        <div class="field"><label for="f-city">Населений пункт</label><input id="f-city" name="Населений пункт" type="text" autocomplete="address-level2"></div>
        <div class="field"><label for="f-pay">Оплата</label><select id="f-pay" name="Оплата"><option>Ще не знаю</option><option>На рахунок (без ПДВ)</option><option>Готівкою при запуску</option></select></div>
        <div class="field field--full"><label for="f-note">Що буде живити генератор</label><textarea id="f-note" name="Що живити" rows="3"></textarea></div>
        <div class="btn-row"><button class="btn btn--amber" type="submit">Замовити генератор</button></div>
        <p class="form__status" role="status" aria-live="polite"></p>
        <p class="form__note">Надсилаючи заявку, ви погоджуєтесь з <a href="{{pre}}konfidentsiinist/">політикою конфіденційності</a>. Платите лише після розрахунку й погодження.</p>
      </form>`;
};
const contactSection = (pre, selected = '', pagePath = '') => `<section class="section dark" id="zamovlennia" aria-labelledby="zam-h">
  <div class="wrap contact">
    <div style="display:grid;gap:24px">
      <p class="label">Замовлення й консультація</p>
      <h2 id="zam-h">Зателефонуйте або напишіть, куди зручно</h2>
      ${cfg.phone ? `<a class="big-phone" href="${telHref}">${esc(phoneShown)}</a>` : ''}
      ${cfg.phone ? `<p class="lead">На цей номер можна дзвонити й писати у Viber, Telegram, WhatsApp або SMS. Порахуємо потужність під ваш перелік обладнання безкоштовно.</p>` : ''}
      ${messengers()}
      <ul class="contact__list">
        ${cfg.email ? `<li>${icon('mail', 'sr-icon')} <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></li>` : ''}
        ${cfg.hours ? `<li>${esc(cfg.hours)}</li>` : ''}
        ${cfg.city ? `<li>Магазин: ${esc([cfg.street, cfg.city].filter(Boolean).join(', '))} · <a class="link" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent([cfg.street, cfg.city].join(' '))}" target="_blank" rel="noopener">Як дістатися</a></li>` : ''}
      </ul>
    </div>
    <div class="form-card"${cfg.hours ? ` data-hours="${esc(cfg.hours)}"` : ''}>
      <p class="label" style="margin-bottom:20px">Заявка на генератор</p>
      ${orderForm(selected, pagePath).replaceAll('{{pre}}', pre)}
    </div>
  </div>
</section>`;

// ---------------------------------------------------------------- structured data
const storeLd = () => ({
  '@type': 'Store',
  '@id': abs('#store') || '#store',
  name: cfg.name,
  ...(cfg.legalName ? { legalName: cfg.legalName } : {}),
  ...(domain ? { url: `${domain}/`, image: `${domain}/share.jpg` } : {}),
  ...(cfg.phone ? { telephone: cfg.phone } : {}),
  ...(cfg.email ? { email: cfg.email } : {}),
  ...(cfg.city ? { address: { '@type': 'PostalAddress', addressCountry: 'UA', addressLocality: cfg.city, ...(cfg.street ? { streetAddress: cfg.street } : {}) } } : {}),
  ...(cfg.hours ? { openingHours: 'Mo-Su 08:00-20:00' } : {}),
  ...(cfg.legalCode ? { taxID: cfg.legalCode } : {}),
  paymentAccepted: 'Готівка, безготівковий розрахунок без ПДВ',
  currenciesAccepted: 'UAH',
  areaServed: { '@type': 'Country', name: 'Україна' },
  description: 'Продаж промислових дизельних генераторів EDON 30–200 кВт з безкоштовною доставкою по Україні, запуском на об’єкті та навчанням персоналу.',
  priceRange: plain(`${price(minPrice)}–${price(Math.max(...products.map(p => p.price)))}`),
});
const shippingLd = { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'UAH' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'UA' } };
const returnLd = {
  '@type': 'MerchantReturnPolicy', applicableCountry: 'UA', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 14, returnMethod: 'https://schema.org/ReturnByMail', returnFees: 'https://schema.org/FreeReturn',
  ...(domain ? { merchantReturnLink: `${domain}/harantiia-ta-povernennia/` } : {}),
};
const productLd = p => ({
  '@type': 'Product', name: p.fullName, sku: p.sku, mpn: p.sku, brand: { '@type': 'Brand', name: 'EDON' }, category: 'Дизельні генератори',
  description: `${p.lead} ${p.fit}`,
  image: [domain ? `${domain}/assets/img/products/${p.image}.jpg` : `assets/img/products/${p.image}.jpg`],
  ...(domain ? { url: `${domain}/generatory/${p.slug}/` } : {}),
  weight: { '@type': 'QuantitativeValue', value: p.weight, unitCode: 'KGM' },
  additionalProperty: [
    { '@type': 'PropertyValue', name: 'Номінальна потужність', value: p.kw, unitCode: 'KWT' },
    { '@type': 'PropertyValue', name: 'Повна потужність', value: `${p.kva} кВА` },
    { '@type': 'PropertyValue', name: 'Напруга', value: '400/230 В, 3 фази, 50 Гц' },
    { '@type': 'PropertyValue', name: 'Двигун', value: p.engine },
    { '@type': 'PropertyValue', name: 'Виконання', value: bodyName(p) },
    { '@type': 'PropertyValue', name: 'АВР у комплекті', value: p.ats ? 'так' : 'ні' },
  ],
  offers: {
    '@type': 'Offer', price: p.price, priceCurrency: 'UAH',
    availability: p.stock === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
    itemCondition: 'https://schema.org/NewCondition', ...(domain ? { url: `${domain}/generatory/${p.slug}/` } : {}),
    seller: { '@id': abs('#store') || '#store' }, shippingDetails: shippingLd, hasMerchantReturnPolicy: returnLd,
  },
});
const breadcrumbLd = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([url, name], i) => ({ '@type': 'ListItem', position: i + 1, name, ...(url !== null && domain ? { item: `${domain}/${url}` } : {}) })) });
function analytics() {
  const ids = [cfg.googleAdsId, cfg.ga4Id].filter(Boolean);
  if (!ids.length) return '';
  const ads = cfg.googleAdsId ? `window.SITE_ADS=${JSON.stringify({ id: cfg.googleAdsId, lead: cfg.googleAdsLeadLabel || '', call: cfg.googleAdsCallLabel || '' })};` : '';
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(ids[0])}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());${ids.map(id => `gtag('config','${esc(id)}');`).join('')}${ads}</script>`;
}

// ---------------------------------------------------------------- page shell
const writePage = ({ path, title, description, main, ld, ogImage, robots = 'index, follow, max-image-preview:large', ogType = 'website', selected = '', onIndex = false, contact = true }) => {
  const depth = path ? path.split('/').filter(Boolean).length : 0;
  const pre = '../'.repeat(depth);
  const html = `${headHtml({ pre, path: path ? `${path}/` : '', title, description, ld, ogImage, robots, ogType })}
<body>
${headerHtml(pre, onIndex)}
<main id="main">
${main.replaceAll('{{pre}}', pre)}
${contact ? contactSection(pre, selected, path ? `${path}/` : '') : ''}
</main>
${footerHtml(pre)}
<script type="application/json" id="models-data">${JSON.stringify(byPower.map(p => ({ sku: p.sku, kw: p.kw, body: p.body, name: p.name, price: p.price, stockText: stockText(p), ats: p.ats, alt: p.alt, img2x: `${pre}assets/img/products/${p.image}-2x.webp`, url: `${pre}generatory/${p.slug}/` })))}</script>
<script src="${pre}assets/app.js?v=${JS_V}" defer></script>
</body>
</html>
`;
  const file = join(SITE, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
};

// ---------------------------------------------------------------- home page sections
const hero = () => {
  const p200 = products.find(p => p.slug === 'edon-200-kvt-vidkryta-rama');
  return `<section class="hero" aria-labelledby="hero-h">
  <div class="wrap hero__grid">
    <div class="hero__text">
      <p class="pill">${icon('bolt')}${products.length} моделей EDON в наявності на складі</p>
      <h1 id="hero-h">Дизельні генератори <span class="accent">30–200&nbsp;кВт</span> для бізнесу</h1>
      <p class="lead">Привеземо безкоштовно в будь-яку область, запустимо на об’єкті й навчимо персонал. Оплата на рахунок без ПДВ або готівкою.</p>
      <p class="hero__price">від <b>${price(minPrice)}</b></p>
      <div class="btn-row">
        <a class="btn btn--amber btn--lg" href="#zamovlennia">Замовити генератор${icon('arrow')}</a>
        ${cfg.phone ? `<a class="btn btn--line btn--lg" href="${telHref}">${icon('phone')}${esc(phoneShown)}</a>` : ''}
      </div>
      <ul class="checks"><li>${icon('check')}Доставка 0 ₴</li><li>${icon('check')}Запуск і навчання</li><li>${icon('check')}Гарантія 12 міс.</li></ul>
    </div>
    <div class="hero__visual">
      <div class="hero__blob" aria-hidden="true"></div>
      ${imgTag(p200, '', { cls: 'hero__img', lazy: false, priority: true, sizes: '(max-width: 1023px) 92vw, 680px' })}
      <span class="float float--1">${icon('check')}В наявності</span>
      <span class="float float--2">${icon('truck')}Доставка 0 ₴</span>
      <span class="float float--3"><small>EDON 200 кВт</small><b>${price(p200.price)}</b></span>
    </div>
  </div>
</section>
<section class="trust" aria-label="Наші переваги">
  <div class="wrap trust__grid">
    <div>${icon('truck')}<p><b>Доставка 0 ₴</b><span>по всій Україні</span></p></div>
    <div>${icon('power')}<p><b>Запуск на об’єкті</b><span>і навчання персоналу</span></p></div>
    <div>${icon('shield')}<p><b>Гарантія 12 місяців</b><span>сервіс і запчастини</span></p></div>
    <div>${icon('cash')}<p><b>Оплата без ПДВ</b><span>на рахунок або готівкою</span></p></div>
  </div>
</section>`;
};

const specRows = p => [
  ['Потужність', `${p.kw} кВт / ${p.kva} кВА`], ['Напруга', '400/230 В, 3 фази'], ['Двигун', p.engine],
  ['Пальне', p.fuelShort], ['Вага', `${p.weight} кг`], ['АВР', p.ats ? 'у комплекті' : 'окремо'],
  ...(p.noise ? [['Шум', p.noise]] : []), ...(p.dims ? [['Габарити', p.dims]] : []),
];
const modelPanel = p => `<article class="model" data-model-panel="${p.sku}" aria-labelledby="m-${p.sku}">
      <div class="model__pic">
        <span class="model__kw" aria-hidden="true">${p.kw}</span>
        <span class="model__tag dot-ok">${stockText(p)}</span>
        ${imgTag(p, '', {})}
      </div>
      <div class="model__info">
        <div style="display:grid;gap:8px"><p class="label">${esc(bodyName(p))} · ${esc(p.sku)}</p><h3 id="m-${p.sku}">${esc(p.fullName)}</h3></div>
        <p class="price">${price(p.price)}</p>
        <dl class="specs">${specRows(p).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <ul class="incl"><li>Доставка 0 ₴</li><li>Запуск на об’єкті</li><li>Навчання персоналу</li><li>Гарантія 12 міс.</li></ul>
        <div class="btn-row"><a class="btn btn--amber" href="#zamovlennia" data-order="${p.sku}">Замовити цю модель</a><a class="btn btn--line" href="generatory/${p.slug}/">Усі характеристики</a></div>
      </div>
    </article>`;

const productCard = p => `<article class="pcard" data-sku="${p.sku}" data-kw="${p.kw}" data-price="${p.price}" data-body="${p.body}" data-ats="${p.ats ? 1 : 0}">
      <a class="pcard__pic" href="generatory/${p.slug}/" tabindex="-1" aria-hidden="true">${imgTag(p, '', { sizes: '(max-width: 640px) 92vw, 400px', vt: true })}<span class="badge">${icon('check')}${stockText(p)}</span>${p.ats ? '<span class="badge badge--dark">АВР у комплекті</span>' : ''}</a>
      <div class="pcard__body">
        <h3><a href="generatory/${p.slug}/">${esc(p.name)}</a></h3>
        <ul class="tags"><li>${p.kva} кВА</li><li>${p.cylinders} циліндри</li><li>${p.weight} кг</li>${p.noise ? `<li>${p.noise}</li>` : ''}</ul>
        <p class="pcard__price">${price(p.price)}</p>
        <p class="pcard__note">з доставкою, запуском і гарантією</p>
        <div class="pcard__btns"><a class="btn btn--amber" href="#zamovlennia" data-order="${p.sku}">Купити</a><a class="btn btn--line" href="generatory/${p.slug}/">Детальніше</a></div>
      </div>
    </article>`;
const modelsSection = () => `<section class="section soft" id="modeli" aria-labelledby="modeli-h">
  <div class="wrap">
    <div class="head head--row"><div><p class="label">Каталог</p><h2 id="modeli-h">Генератори в наявності</h2></div><a class="link" href="#porivniannia">Порівняти всі в таблиці</a></div>
    <div class="filters" data-filters>
      <div class="seg" role="group" aria-label="Виконання генератора">
        <button type="button" data-filter="all" aria-pressed="true">Усі <span>${products.length}</span></button>
        <button type="button" data-filter="open" aria-pressed="false">Відкрита рама <span>${products.filter(p => p.body === 'open').length}</span></button>
        <button type="button" data-filter="canopy" aria-pressed="false">У кожусі <span>${products.filter(p => p.body === 'canopy').length}</span></button>
        <button type="button" data-filter="ats" aria-pressed="false">З АВР <span>${products.filter(p => p.ats).length}</span></button>
      </div>
      <label class="sort"><span>Сортувати</span><select data-sort><option value="kw">за потужністю</option><option value="price-asc">спочатку дешевші</option><option value="price-desc">спочатку дорожчі</option></select></label>
      <p class="sr-only" role="status" data-filter-status></p>
    </div>
    <div class="catalog">
    ${byPower.map(productCard).join('\n    ')}
      <aside class="pcard pcard--help"><div>${icon('calc')}<h3>Не знаєте, яку потужність обрати?</h3><p>Порахуємо безкоштовно за переліком вашого обладнання з урахуванням пускових струмів.</p></div><div class="btn-row"><a class="btn btn--amber" href="#pidbir">Калькулятор</a>${cfg.phone ? `<a class="btn btn--ghost" href="${telHref}">${icon('phone')}Подзвонити</a>` : ''}</div></aside>
    </div>
  </div>
</section>`;

const WHY = [
  ['truck', 'Безкоштовна доставка', 'Привеземо вантажним авто до вашого об’єкта в будь-яку область України.'],
  ['power', 'Запуск фахівцем', 'Перевіримо майданчик, вихлоп і підключення, запустимо генератор під навантаженням.'],
  ['users', 'Навчання персоналу', 'Покажемо запуск, зупинку, обкатку й щомісячну перевірку станції.'],
  ['shield', 'Гарантія 12 місяців', 'Гарантійний ремонт, сервіс і запчастини беремо на себе.'],
  ['cash', 'Зручна оплата', 'На рахунок без ПДВ або готівкою фахівцю під час запуску.'],
  ['store', 'Магазин у Тернополі', `${cfg.street ? esc(cfg.street) + '. ' : ''}Можна приїхати, подивитися й порадитися.`],
];
const whySection = () => `<section class="section" id="chomu-my" aria-labelledby="why-h">
  <div class="wrap">
    <div class="head"><p class="label">Чому ми</p><h2 id="why-h">Не просто продаємо — запускаємо під ключ</h2></div>
    <div class="why">${WHY.map(([ic, t, d]) => `<div class="why__item"><span class="why__ic">${icon(ic)}</span><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>
  </div>
</section>`;

const PRESETS = [['Магазин, кафе', 25], ['СТО', 35], ['Ферма', 45], ['Цех на 5–8 верстатів', 60], ['Виробництво', 110], ['Готель, ТЦ', 140], ['Холодильний склад', 180]];
const calcSection = () => `<section class="section dark" id="pidbir" aria-labelledby="pidbir-h">
  <div class="wrap">
    <div class="head"><p class="label">Калькулятор потужності</p><h2 id="pidbir-h">Скільки кВт потрібно вашому об’єкту</h2><p class="lead">Оберіть тип об’єкта або вкажіть пікове навантаження. Калькулятор додасть запас 25%, а для електродвигунів — 50% на пускові струми.</p></div>
    <div class="calc" data-calc>
      <div class="calc__in">
        <div class="presets" role="group" aria-label="Тип об’єкта">${PRESETS.map(([t, k], i) => `<button type="button" data-kw="${k}" aria-pressed="${i === 3}">${esc(t)}<small>≈${k}&nbsp;кВт</small></button>`).join('')}</div>
        <div class="range">
          <div class="range__top"><label for="c-peak">Пікове навантаження обладнання</label><output for="c-peak" aria-live="polite">60<small>кВт</small></output></div>
          <input id="c-peak" type="range" min="5" max="220" step="5" value="60">
        </div>
        <label class="check"><input id="c-motors" type="checkbox"><span>Є електродвигуни: компресори, насоси, ліфти, верстати. На пуску вони беруть у 3–6 разів більше струму.</span></label>
        <p class="muted" style="font-size:15px">Розрахунок орієнтовний. Точну потужність порахуємо безкоштовно за переліком вашого обладнання.</p>
      </div>
      <div class="result" data-result>
        <p class="label">Рекомендуємо</p>
        <div class="result__model"><div style="display:grid;gap:8px"><p class="result__name" data-r-name>EDON 100 кВт, відкрита рама</p><p class="mono" data-r-price style="color:var(--on-dark-2)"></p></div><img data-r-img src="assets/img/products/edon-100-kvt-vidkryta-rama-2x.webp" alt="" width="488" height="309" loading="lazy"></div>
        <div class="gauge"><div class="range__top"><span class="muted" style="font-size:14px">Навантаження генератора</span><b class="mono" data-r-load>60%</b></div><div class="gauge__bar"><span class="gauge__ok"></span><span class="gauge__fill"></span></div><div class="gauge__scale"><span>0%</span><span>50–75% оптимум</span><span>100%</span></div></div>
        <p data-r-text style="color:var(--on-dark-2)"></p>
        <div class="btn-row"><a class="btn btn--amber" href="#zamovlennia" data-r-btn data-order="">Замовити</a><a class="btn btn--ghost" data-r-link href="#modeli">Характеристики</a></div>
      </div>
    </div>
  </div>
</section>`;

const STEPS = [
  ['Розрахунок', 'Дзвоните або пишете. Менеджер питає, що живитиме генератор, і рахує потужність з урахуванням пускових струмів.'],
  ['Доставка 0 ₴', 'Привозимо вантажним авто до вашого об’єкта в будь-яку область. Для розвантаження потрібен навантажувач або маніпулятор.'],
  ['Перший запуск', 'Фахівець перевіряє майданчик, вихлоп і підключення, заводить генератор і дає йому навантаження.'],
  ['Навчання', 'Показуємо персоналу запуск, зупинку, обкатку 50 мотогодин і щомісячну перевірку. Далі — гарантія 12 місяців.'],
];
const processSection = () => `<section class="section" id="dostavka" aria-labelledby="dostavka-h">
  <div class="wrap">
    <div class="head head--row"><div style="display:grid;gap:16px"><p class="label">Доставка, запуск, навчання</p><h2 id="dostavka-h">Від дзвінка до світла на вашому об’єкті</h2></div><a class="link" href="dostavka-i-oplata/">Умови доставки й оплати</a></div>
    <div class="split split--top">
      <figure class="photo" style="aspect-ratio:4/3.4"><img src="assets/img/photo-f80268893-c.webp" srcset="assets/img/photo-f80268893-c-520.webp 520w, assets/img/photo-f80268893-c.webp 1040w" sizes="(max-width: 1023px) 92vw, 520px" width="1040" height="848" alt="Кран опускає дизельну електростанцію на бетонний майданчик, монтажники тримають її стропами" loading="lazy" decoding="async"></figure>
      <ol class="cards cards--2">
        ${STEPS.map(([t, d], i) => `<li class="card"><span class="card__num">0${i + 1}</span><h3>${t}</h3><p>${d}</p></li>`).join('\n        ')}
      </ol>
    </div>
  </div>
</section>`;

const atsSection = () => `<section class="section dark-2" id="avr" aria-labelledby="avr-h">
  <div class="wrap split">
    <div style="display:grid;gap:20px">
      <p class="label">Автоматичний ввід резерву</p>
      <h2 id="avr-h">АВР у комплекті з усіма моделями від 50&nbsp;кВт</h2>
      <p class="lead">Зникла напруга в мережі — АВР сам запускає генератор і перемикає на нього об’єкт. Повернулась мережа — переводить навантаження назад і глушить двигун.</p>
      <ul class="ticks"><li>Не треба окремо купувати блок автозапуску</li><li>Підключаємо лише через АВР або перекидний рубильник: пряме підключення до вводу небезпечне для бригад на лінії</li><li>Для GJ-30GF на 30 кВт АВР підбираємо окремо</li></ul>
    </div>
    <figure class="schema" role="img" aria-label="Схема: мережа 400 вольт і генератор EDON підключені до АВР; коли напруги в мережі немає, АВР живить ваш об’єкт від генератора">
      <svg viewBox="0 0 640 330" aria-hidden="true">
        <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10z" fill="#FF8A1F"/></marker></defs>
        <path d="M190 72 H245 V150 H280" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2" stroke-dasharray="4 6"/>
        <path d="M230 98 l14 14 M244 98 l-14 14" stroke="#FF7A6E" stroke-width="2.4" stroke-linecap="round"/>
        <path class="flow" d="M190 258 H245 V180 H276" fill="none" stroke="#FF8A1F" stroke-width="2.4" marker-end="url(#ah)"/>
        <path class="flow" d="M392 165 H466" fill="none" stroke="#FF8A1F" stroke-width="2.4" marker-end="url(#ah)"/>
        <rect x="16" y="40" width="174" height="64" rx="10" fill="#0B1F3A" stroke="rgba(255,255,255,.18)"/>
        <text x="34" y="68" fill="#F2F1EE" font-size="15">Мережа 400 В</text><text x="34" y="90" fill="#FF9C93" font-size="12">напруги немає</text>
        <rect x="16" y="226" width="174" height="64" rx="10" fill="#0B1F3A" stroke="#FF8A1F"/>
        <text x="34" y="254" fill="#F2F1EE" font-size="15">Генератор EDON</text><text x="34" y="276" fill="#FF8A1F" font-size="12">запущено</text>
        <rect x="280" y="131" width="112" height="68" rx="10" fill="#FF8A1F"/>
        <text x="336" y="171" fill="#160A00" font-size="18" text-anchor="middle" font-weight="500">АВР</text>
        <rect x="468" y="131" width="156" height="68" rx="10" fill="#0B1F3A" stroke="rgba(255,255,255,.18)"/>
        <text x="486" y="161" fill="#F2F1EE" font-size="15">Ваш об’єкт</text><text x="486" y="183" fill="#B9BCC1" font-size="12">світло є</text>
      </svg>
    </figure>
  </div>
</section>`;

const paySection = () => `<section class="section soft" id="oplata" aria-labelledby="oplata-h">
  <div class="wrap">
    <div class="head"><p class="label">Оплата</p><h2 id="oplata-h">Два зручні способи оплати</h2><p class="lead">Працюємо без ПДВ: на рахунок або готівкою. Суму менеджер підтверджує до оплати, платите лише після погодження.</p></div>
    <div class="cards cards--2">
      <div class="card"><span class="pay__tag">На рахунок</span><h3>Безготівково, без ПДВ</h3><p>Для ФОП, підприємств, фермерських господарств і приватних клієнтів. Оплата на рахунок після погодження замовлення.</p></div>
      <div class="card"><span class="pay__tag">Готівка</span><h3>Готівкою при запуску</h3><p>Розраховуєтесь з нашим фахівцем на вашому об’єкті, коли генератор уже запрацював.</p></div>
    </div>
  </div>
</section>`;

const compareSection = () => `<section class="section" id="porivniannia" aria-labelledby="por-h">
  <div class="wrap">
    <div class="head"><p class="label">Порівняння</p><h2 id="por-h">Сім моделей в одній таблиці</h2><p class="lead">Ціна вже включає доставку, перший запуск, навчання й гарантію 12 місяців.</p></div>
    <div class="table-wrap">
      <table class="cmp">
        <thead><tr><th scope="col">Модель</th><th scope="col">Потужність</th><th scope="col">Двигун</th><th scope="col">Пальне</th><th scope="col">Вага</th><th scope="col">АВР</th><th scope="col">Ціна</th></tr></thead>
        <tbody>
${byPower.map(p => `          <tr><th scope="row"><a href="generatory/${p.slug}/">${esc(p.name)}</a></th><td data-label="Потужність:">${p.kw} кВт / ${p.kva} кВА</td><td data-label="Двигун:">${p.cylinders} цил.</td><td data-label="Пальне:">${esc(p.fuelShort)}</td><td data-label="Вага:">${p.weight} кг</td><td data-label="АВР:">${p.ats ? 'так' : 'окремо'}</td><td data-label="Ціна:">${price(p.price)}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </div>
  </div>
</section>`;

const FAQ = [
  ['Як можна оплатити?', 'На рахунок без ПДВ або готівкою нашому фахівцю під час запуску. Платите лише після розрахунку й погодження.'],
  ['Скільки коштує доставка?', 'Нічого: доставка до вашого об’єкта входить у ціну в будь-яку область на підконтрольній Україні території.'],
  ['Що підготувати до приїзду генератора?', 'Рівний бетонний майданчик або фундамент, вивід вихлопу назовні й приплив повітря до радіатора. Перелік оливи, антифризу й акумулятора надішлемо після замовлення.'],
  ['Кожух чи відкрита рама?', 'Кожух знижує шум до 75 дБ у моделі на 100 кВт і закриває машину від дощу. Відкрита рама дешевша на 125 000–230 000 ₴ і підходить для окремого приміщення.'],
  ['Яка гарантія?', 'Дванадцять місяців на кожен генератор. Гарантійний ремонт, сервіс і запчастини беремо на себе.'],
  ['Як із вами зв’язатися?', cfg.phone ? `Дзвоніть на ${phoneShown} або пишіть на цей самий номер у Viber, Telegram, WhatsApp чи SMS.${cfg.email ? ` Пошта: ${cfg.email}.` : ''}` : 'Залиште заявку у формі нижче.'],
];
const faqSection = () => `<section class="section soft" id="pytannia" aria-labelledby="faq-h">
  <div class="wrap">
    <div class="head"><p class="label">Питання</p><h2 id="faq-h">Що питають перед покупкою</h2></div>
    <div class="faq">${FAQ.map(([q, a]) => `<div><h3>${esc(q)}</h3><p>${esc(a)}</p></div>`).join('')}</div>
  </div>
</section>`;

const faqLd = { '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };

writePage({
  path: '', onIndex: true,
  title: `${cfg.name}: дизельні генератори EDON 30–200 кВт з доставкою по Україні`,
  description: `Сім моделей промислових генераторів EDON на складі, від ${plain(price(minPrice))}. Безкоштовна доставка, запуск на об’єкті й навчання. Оплата на рахунок (без ПДВ) або готівкою.`,
  main: [hero(), modelsSection(), whySection(), calcSection(), processSection(), paySection(), atsSection(), compareSection(), faqSection()].join('\n'),
  ld: { '@graph': [storeLd(), { '@type': 'WebSite', name: cfg.name, inLanguage: 'uk', ...(domain ? { url: `${domain}/` } : {}) }, { '@type': 'ItemList', name: 'Дизельні генератори EDON на складі', itemListElement: byPower.map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: productLd(p) })) }, faqLd] },
});

// ---------------------------------------------------------------- product pages
const SIZING = [['Магазин або кафе з холодильними вітринами', 25], ['СТО з підйомниками й компресором', 35], ['Ферма з доїльним залом і вентиляцією', 45], ['Цех на 5–8 верстатів до 7,5 кВт', 60], ['Виробництво з кількома лініями', 110], ['Готель або торговий центр', 140], ['Великий холодильний склад', 180]];
const verdict = (need, kw) => (need * 1.25 <= kw ? ['v-ok', 'вистачить із запасом'] : need <= kw ? ['v-edge', 'на межі'] : ['v-no', 'замало']);
const crumbs = (pre, items) => `<nav class="crumbs" aria-label="Навігаційний ланцюжок"><ol><li><a href="${pre}">Головна</a></li>${items.map(([href, t]) => href ? `<li><a href="${href}">${esc(t)}</a></li>` : `<li aria-current="page">${esc(t)}</li>`).join('')}</ol></nav>`;

for (const p of byPower) {
  const path = `generatory/${p.slug}`;
  const others = byPower.filter(o => o.slug !== p.slug).sort((a, b) => Math.abs(a.kw - p.kw) - Math.abs(b.kw - p.kw)).slice(0, 3);
  const full = [
    ['Номінальна потужність', `${p.kw} кВт / ${p.kva} кВА`], ['Напруга', '400/230 В, три фази'], ['Частота', '50 Гц'], ['Коефіцієнт потужності', 'cos φ 0,8'],
    ['Двигун', p.engine], ['Запуск', p.ats ? 'електростартер; автоматично через АВР' : 'електростартер 12 В, вручну'], ['АВР', p.ats ? 'у комплекті' : 'підбираємо окремо'],
    ['Витрата пального', p.fuel], ...(p.insulation ? [['Клас ізоляції обмотки', p.insulation]] : []), ...(p.ip ? [['Ступінь захисту', p.ip]] : []),
    ['Виконання', bodyName(p)], ...(p.noise ? [['Рівень шуму', p.noise]] : []), ...(p.dims ? [['Габарити', p.dims]] : []), ['Вага', `${p.weight} кг`], ['Гарантія', '12 місяців'], ['Артикул', p.sku],
  ];
  const main = `<section class="pp" aria-labelledby="pp-h">
  <div class="wrap">
    ${crumbs('{{pre}}', [['{{pre}}#modeli', 'Генератори'], [null, p.name]])}
    <div class="pp__grid">
      <div class="model__pic" style="min-height:460px"><span class="model__kw" aria-hidden="true">${p.kw}</span><span class="model__tag dot-ok">${stockText(p)}</span>${imgTag(p, '{{pre}}', { lazy: false, priority: true, vt: true })}</div>
      <div class="model__info pp__buy">
        <div style="display:grid;gap:10px"><p class="label">EDON · ${esc(bodyName(p))} · ${esc(p.sku)}</p><h1 id="pp-h">${esc(p.fullName)}</h1></div>
        <p class="price">${price(p.price)}</p>
        <p>${esc(p.lead)}</p>
        <div class="mini"><div><b>${p.kw} кВт</b><span>${p.kva} кВА, 400/230 В</span></div><div><b>${p.cylinders} циліндри</b><span>рідинне охолодження</span></div><div><b>${p.weight} кг</b><span>${esc(bodyName(p))}</span></div><div><b>${p.ats ? 'АВР' : 'Без АВР'}</b><span>${p.ats ? 'у комплекті' : 'підбираємо окремо'}</span></div></div>
        <ul class="incl"><li>Доставка 0 ₴ по Україні</li><li>Запуск на об’єкті</li><li>Навчання персоналу</li><li>Гарантія 12 міс.</li></ul>
        <div class="btn-row"><a class="btn btn--amber" href="#zamovlennia" data-order="${p.sku}">Замовити генератор</a>${cfg.phone ? `<a class="btn btn--line" href="${telHref}">${icon('phone')}${esc(phoneShown)}</a>` : ''}</div>
        <p class="muted" style="font-size:15px">Оплата ${payText}. ${cfg.phone ? 'Пишіть на цей номер у Viber, Telegram, WhatsApp або SMS.' : ''}</p>
      </div>
    </div>
  </div>
</section>
<section class="section paper-2" aria-labelledby="spec-h">
  <div class="wrap split split--top">
    <div style="display:grid;gap:16px"><p class="label">Паспорт моделі</p><h2 id="spec-h">Технічні характеристики</h2><p class="lead">${esc(p.fit)}</p></div>
    <div class="table-wrap" style="padding:8px 28px"><dl class="specs">${full.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>
  </div>
</section>
<section class="section" aria-labelledby="fit-h">
  <div class="wrap split split--top">
    <div style="display:grid;gap:16px"><p class="label">Підбір</p><h2 id="fit-h">Які об’єкти закриє ${p.kw}&nbsp;кВт</h2><p class="lead">Орієнтовні піки навантаження із запасом 25%. Точну потужність рахуємо безкоштовно за переліком вашого обладнання.</p><p><a class="link" href="{{pre}}#pidbir">Калькулятор потужності</a></p></div>
    <div class="table-wrap verdicts" style="padding:8px 28px"><dl class="specs">${SIZING.map(([t, k]) => { const [c, v] = verdict(k, p.kw); return `<div><dt>${esc(t)}, ≈ ${k} кВт</dt><dd class="${c}">${v}</dd></div>`; }).join('')}</dl></div>
  </div>
</section>
<section class="section paper-2" aria-labelledby="prep-h">
  <div class="wrap">
    <div class="head"><p class="label">Перед запуском</p><h2 id="prep-h">Що підготувати на об’єкті</h2><p class="lead">Генератор важить ${p.weight} кг. Розвантаження навантажувачем або маніпулятором узгоджуємо заздалегідь.</p></div>
    <ol class="cards cards--4">
      <li class="card"><span class="card__num">01</span><h3>Майданчик</h3><p>Рівний бетон або фундамент: машина вібрує, на ґрунт чи асфальт її не ставлять.</p></li>
      <li class="card"><span class="card__num">02</span><h3>Вихлоп і повітря</h3><p>Вивід вихлопу назовні й приплив до радіатора, інакше він перегріється навіть узимку.</p></li>
      <li class="card"><span class="card__num">03</span><h3>Підключення</h3><p>Через АВР або перекидний рубильник. Пряме підключення до вводу небезпечне.</p></li>
      <li class="card"><span class="card__num">04</span><h3>Рідини й АКБ</h3><p>Олива, антифриз і акумулятор: перелік надішлемо. Обкатка — 50 мотогодин.</p></li>
    </ol>
  </div>
</section>
<section class="section" aria-labelledby="more-h">
  <div class="wrap">
    <div class="head head--row"><h2 id="more-h">Інші моделі EDON</h2><a class="link" href="{{pre}}#porivniannia">Порівняти всі</a></div>
    <div class="cards cards--3">
      ${others.map(o => `<a class="card" href="{{pre}}generatory/${o.slug}/"><div class="model__pic" style="min-height:220px;padding:20px;border:0;background:var(--paper)">${imgTag(o, '{{pre}}', { sizes: '(max-width: 1023px) 92vw, 380px' })}</div><h3>${esc(o.name)}</h3><p class="mono">${price(o.price)} · ${stockText(o).toLowerCase()}</p></a>`).join('\n      ')}
    </div>
  </div>
</section>`;
  writePage({
    path, selected: p.slug, ogType: 'product', ogImage: `assets/img/products/${p.image}.jpg`,
    title: `${p.fullName} — ціна ${plain(price(p.price))} | ${cfg.name}`,
    description: `EDON ${p.kw} кВт (${p.kva} кВА), ${bodyName(p)}${p.ats ? ', АВР у комплекті' : ''}. ${stockText(p)}. Безкоштовна доставка по Україні, запуск і навчання. Оплата на рахунок (без ПДВ) або готівкою.`,
    main,
    ld: { '@graph': [productLd(p), breadcrumbLd([['', 'Головна'], ['#modeli', 'Генератори'], [`${path}/`, p.name]])] },
  });
}

// ---------------------------------------------------------------- buyer pages
const seller = () => cfg.legalName ? `<p><strong>Продавець:</strong> ${esc(cfg.legalName)}${cfg.legalCode ? `, РНОКПП ${esc(cfg.legalCode)}` : ''}${cfg.legalAddress ? `, ${esc(cfg.legalAddress)}` : ''}.</p>` : '';
const contactsProse = () => `<ul>
          ${cfg.phone ? `<li>Телефон: <a href="${telHref}">${esc(phoneShown)}</a> — дзвінки, Viber, Telegram, WhatsApp, SMS</li>` : ''}
          ${cfg.email ? `<li>Ел. пошта: <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></li>` : ''}
          ${cfg.city ? `<li>Магазин: ${esc([cfg.street, cfg.city].filter(Boolean).join(', '))}</li>` : ''}
          ${cfg.hours ? `<li>Графік: ${esc(cfg.hours)}</li>` : ''}
        </ul>`;
const prosePage = (path, h1, title, description, html) => writePage({
  path, title: `${title} | ${cfg.name}`, description,
  main: `<section class="pp"><div class="wrap">${crumbs('{{pre}}', [[null, h1]])}<div class="prose" style="margin-top:32px"><h1>${esc(h1)}</h1>${html}</div></div></section>`,
  ld: { '@graph': [breadcrumbLd([['', 'Головна'], [`${path}/`, h1]])] },
});

prosePage('dostavka-i-oplata', 'Доставка й оплата', 'Доставка й оплата генераторів', 'Безкоштовна доставка генераторів EDON по Україні, перший запуск на об’єкті, оплата на рахунок без ПДВ або готівкою.', `
        <h2>Доставка</h2>
        <p>Доставка будь-якого генератора з каталогу безкоштовна. Привозимо його вантажним транспортом до вашого об’єкта на підконтрольній Україні території. Дату й час узгоджує менеджер після замовлення: строк залежить від області та моделі.</p>
        <p>Генератори важать від 500 до 1650 кг. Для розвантаження на об’єкті потрібен навантажувач або маніпулятор; заздалегідь узгодьте під’їзд до місця встановлення.</p>
        <h2>Перший запуск і навчання</h2>
        <p>Після доставки наш фахівець перевіряє майданчик, вихлоп, вентиляцію та схему підключення, запускає генератор і дає йому навантаження. Потім показує персоналу, як запускати й зупиняти станцію, проходити обкатку (50 мотогодин на навантаженні 50–70%) і щомісяця перевіряти її під навантаженням. Запуск і навчання входять у ціну.</p>
        <h2>Оплата</h2>
        <ul>
          <li><strong>На рахунок</strong> — безготівково, без ПДВ, після погодження замовлення.</li>
          <li><strong>Готівкою</strong> — нашому фахівцю під час запуску на вашому об’єкті.</li>
        </ul>
        <p>Ціни на сайті вказані в гривнях і вже включають доставку, перший запуск, навчання й гарантію 12 місяців. Суму в рахунку для обраного способу оплати менеджер підтверджує до оплати.</p>
        ${seller()}`);

prosePage('harantiia-ta-povernennia', 'Гарантія й повернення', 'Гарантія та повернення', 'Гарантія 12 місяців на генератори EDON, умови гарантійного ремонту, обміну та повернення.', `
        <h2>Гарантія 12 місяців</h2>
        <p>На кожен генератор діє гарантія 12 місяців від дати першого запуску на вашому об’єкті. Протягом цього строку ми безкоштовно усуваємо заводські дефекти: ремонтуємо або замінюємо несправні вузли.</p>
        <p>Гарантія зберігається, якщо генератор встановлено й підключено за вимогами (майданчик, вихлоп, вентиляція, АВР або перекидний рубильник), обкатку й технічне обслуговування проведено за регламентом, а в станцію заливали рекомендовані оливу, антифриз і пальне.</p>
        <p>Гарантія не покриває витратні матеріали (фільтри, оливу, антифриз, акумулятор), пошкодження від неправильного підключення, перевантаження, стихійних лих, механічних ушкоджень і втручання сторонніх осіб.</p>
        <h2>Як звернутися за гарантією</h2>
        <p>Повідомте модель, артикул, дату запуску й опис несправності, додайте фото або відео. Ми узгодимо діагностику на місці або доставку вузла в сервіс.</p>
        ${contactsProse()}
        <h2>Обмін і повернення</h2>
        <p>Обмін і повернення товару належної якості для споживачів здійснюються відповідно до Закону України «Про захист прав споживачів» протягом 14 днів, якщо генератор не був у використанні та збережено його товарний вигляд і комплектність. Якщо генератор має недолік, ви маєте права, передбачені статтею 8 цього Закону: ремонт, заміна, зменшення ціни або повернення коштів.</p>
        <p>Повернення коштів здійснюємо тим самим способом, яким було проведено оплату. Для юридичних осіб і ФОП умови повернення визначає договір поставки.</p>
        ${seller()}`);

prosePage('oferta', 'Публічна оферта', 'Публічна оферта', 'Умови продажу дизельних генераторів EDON: замовлення, ціна, оплата, доставка, приймання, гарантія.', `
        <p>Цей документ — пропозиція укласти договір купівлі-продажу генераторів, представлених на сайті, на умовах нижче. Оформлюючи замовлення, покупець погоджується з цими умовами.</p>
        ${seller()}
        <h2>1. Предмет</h2>
        <p>Продавець передає у власність покупця генератор, обраний на сайті або погоджений з менеджером, а покупець приймає та оплачує його. Продавець продає генератори EDON як дилер і не є їх виробником.</p>
        <h2>2. Замовлення</h2>
        <p>Замовлення оформлюється через форму на сайті, телефоном або в месенджері. Менеджер підтверджує модель, ціну, спосіб оплати, адресу та дату доставки. Договір вважається укладеним з моменту такого підтвердження.</p>
        <h2>3. Ціна й оплата</h2>
        <p>Ціни вказано в гривнях; вони включають доставку по Україні, перший запуск, навчання персоналу та гарантію 12 місяців. Оплата безготівкова без ПДВ або готівкою під час запуску. Сума, підтверджена менеджером, не змінюється після підтвердження замовлення.</p>
        <h2>4. Доставка й приймання</h2>
        <p>Продавець доставляє генератор до об’єкта покупця на підконтрольній Україні території. Покупець забезпечує під’їзд і техніку для розвантаження. Під час приймання покупець перевіряє комплектність і відсутність механічних пошкоджень.</p>
        <h2>5. Гарантія, обмін і повернення</h2>
        <p>Умови описано на сторінці <a href="{{pre}}harantiia-ta-povernennia/">«Гарантія й повернення»</a>.</p>
        <h2>6. Персональні дані</h2>
        <p>Обробка даних покупця описана в <a href="{{pre}}konfidentsiinist/">політиці конфіденційності</a>.</p>
        <h2>7. Спори</h2>
        <p>Спори вирішуються шляхом переговорів, а якщо згоди не досягнуто — відповідно до законодавства України.</p>`);

prosePage('konfidentsiinist', 'Політика конфіденційності', 'Політика конфіденційності', 'Які персональні дані збирає сайт, навіщо, як довго їх зберігаємо та як ними керувати.', `
        <p>Ця політика пояснює, які дані ми отримуємо через сайт і як їх використовуємо. Ми обробляємо персональні дані відповідно до Закону України «Про захист персональних даних».</p>
        ${seller()}
        <h2>Які дані ми отримуємо</h2>
        <ul>
          <li>З форми замовлення: ім’я, номер телефону, населений пункт, обрані модель і спосіб оплати, ваш коментар.</li>
          <li>З месенджерів і пошти: те, що ви самі нам напишете.</li>
          <li>Технічні дані: IP-адреса, тип пристрою й браузера, сторінки, з яких ви прийшли, а також файли cookie, якщо на сайті ввімкнено Google Analytics або Google Ads.</li>
        </ul>
        <h2>Навіщо</h2>
        <ul>
          <li>Щоб зв’язатися з вами, порахувати потужність, оформити доставку, запуск і гарантію.</li>
          <li>Щоб вимірювати ефективність реклами та покращувати сайт (знеособлена статистика).</li>
        </ul>
        <h2>Кому ми передаємо дані</h2>
        <p>Ми не продаємо персональні дані. ${formSubmit ? 'Заявки з форми надходять нам на електронну пошту через сервіс FormSubmit (formsubmit.co), який зберігає їх до 30 днів.' : 'Заявки з форми надходять нам на електронну пошту.'} Статистика відвідувань передається до Google (Google Analytics, Google Ads), якщо ці сервіси ввімкнені. Перевізнику ми передаємо лише ім’я, телефон і адресу доставки.</p>
        <h2>Скільки зберігаємо</h2>
        <p>Дані заявок зберігаємо до 3 років після останнього контакту або довше, якщо цього вимагає законодавство (бухгалтерські та гарантійні документи).</p>
        <h2>Ваші права</h2>
        <p>Ви можете дізнатися, які дані ми маємо, виправити їх або вимагати видалення, написавши чи зателефонувавши нам. Файли cookie можна видалити або заборонити в налаштуваннях браузера; персоналізацію реклами Google вимикають на сторінці adssettings.google.com.</p>
        ${contactsProse()}`);

prosePage('kontakty', 'Контакти й реквізити', 'Контакти', `Як зв’язатися з ${cfg.name}: телефон і месенджери, пошта, адреса магазину, реквізити продавця.`, `
        <p>${esc(cfg.name)} продає промислові дизельні генератори EDON на 30–200 кВт, безкоштовно довозить їх по Україні, запускає на об’єкті й навчає персонал. Ми дилер і не є виробником EDON.</p>
        <h2>Зв’язок</h2>
        ${contactsProse()}
        <h2>Реквізити</h2>
        ${seller() || '<p>Реквізити надає менеджер під час оформлення замовлення.</p>'}`);

prosePage('credits', 'Джерела фотографій', 'Джерела фотографій', 'Ліцензії фотографій, використаних на сайті.', `
        <p>Фотографії генераторів EDON надав постачальник. Фото в розділі доставки — з Wikimedia Commons за вільною ліцензією:</p>
        <ul>
          <li>«Blue Grass Chemical Agent-Destruction Pilot Plant Standby Diesel Generator», PEO ACWA, <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>, кадровано, <a href="https://commons.wikimedia.org/wiki/File:Blue_Grass_Chemical_Agent-Destruction_Pilot_Plant_Standby_Diesel_Generator_(12119019006).jpg">джерело</a>.</li>
        </ul>
        <p>Іконки Viber, Telegram і WhatsApp — Simple Icons (CC0); назви й знаки належать їх власникам.</p>`);

// thank-you page: where FormSubmit sends a visitor whose browser posted the form without JavaScript (_next)
writePage({ path: 'dyakuiemo', contact: false, robots: 'noindex, follow', title: `Заявку прийнято | ${cfg.name}`, description: 'Дякуємо за заявку на генератор EDON. Менеджер передзвонить на вказаний номер.',
  main: `<section class="pp"><div class="wrap prose" style="padding-block:64px"><p class="label">Заявка на генератор</p><h1>Дякуємо, заявку прийнято</h1><p>Менеджер передзвонить на вказаний номер${cfg.hours ? ` (${esc(cfg.hours)})` : ''} і порахує потужність під ваш об’єкт.</p>${cfg.phone ? `<p style="margin-top:24px">Терміново? Зателефонуйте на <a href="${telHref}">${esc(phoneShown)}</a> або напишіть на цей номер:</p><div style="margin-top:12px">${messengers()}</div>` : ''}<p style="margin-top:32px"><a class="btn btn--amber" href="{{pre}}#modeli">Повернутися до каталогу</a></p></div></section>` });

// 404
writePage({ path: '404-page', contact: false, robots: 'noindex, follow', title: `Сторінку не знайдено | ${cfg.name}`, description: 'Такої сторінки немає. Перейдіть до каталогу генераторів EDON.',
  main: `<section class="pp"><div class="wrap prose" style="padding-block:64px"><h1>Такої сторінки немає</h1><p>Можливо, модель перейменовано. Усі генератори з цінами — у каталозі.</p><p style="margin-top:24px"><a class="btn btn--amber" href="/#modeli">Переглянути генератори</a></p></div></section>` });
{
  const f = join(SITE, '404-page/index.html');
  writeFileSync(join(SITE, '404.html'), readFileSync(f, 'utf8').replaceAll('href="../', 'href="/').replaceAll('src="../', 'src="/'));
}

// ---------------------------------------------------------------- robots, sitemap, feed, llms.txt
const pages = ['', ...byPower.map(p => `generatory/${p.slug}/`), 'dostavka-i-oplata/', 'harantiia-ta-povernennia/', 'oferta/', 'konfidentsiinist/', 'kontakty/'];
writeFileSync(join(SITE, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /404-page/\n\nUser-agent: AdsBot-Google\nAllow: /\n\nUser-agent: AdsBot-Google-Mobile\nAllow: /\n${domain ? `\nSitemap: ${domain}/sitemap.xml\n` : ''}`);
for (const f of ['sitemap.xml', 'merchant-feed.xml']) if (!domain && existsSync(join(SITE, f))) rmSync(join(SITE, f));
if (domain) {
  writeFileSync(join(SITE, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(u => `  <url><loc>${domain}/${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  const x = s => esc(s).replace(/'/g, '&apos;');
  writeFileSync(join(SITE, 'merchant-feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${x(cfg.name)}: генератори EDON</title>
<link>${domain}/</link>
<description>Дизельні генератори EDON 30–200 кВт</description>
${byPower.map(p => `<item>
  <g:id>${x(p.sku)}</g:id>
  <g:title>${x(p.fullName)}</g:title>
  <g:description>${x(`${p.lead} ${p.fit} Безкоштовна доставка по Україні, запуск на об’єкті, навчання персоналу, гарантія 12 місяців. Оплата на рахунок (без ПДВ) або готівкою.`)}</g:description>
  <g:link>${domain}/generatory/${p.slug}/</g:link>
  <g:image_link>${domain}/assets/img/products/${p.image}.jpg</g:image_link>
  <g:condition>new</g:condition>
  <g:availability>${p.stock === 'in_stock' ? 'in_stock' : 'preorder'}</g:availability>
  <g:price>${p.price}.00 UAH</g:price>
  <g:brand>EDON</g:brand>
  <g:mpn>${x(p.sku)}</g:mpn>
  <g:identifier_exists>no</g:identifier_exists>
  <g:google_product_category>Hardware &gt; Power &amp; Electrical Supplies &gt; Generators</g:google_product_category>
  <g:product_type>Генератори &gt; Дизельні &gt; ${p.kw} кВт</g:product_type>
  <g:shipping_weight>${p.weight} kg</g:shipping_weight>
  <g:shipping><g:country>UA</g:country><g:price>0 UAH</g:price></g:shipping>
</item>`).join('\n')}
</channel>
</rss>
`);
}
const u = p => (domain ? `${domain}/${p}` : p);
writeFileSync(join(SITE, 'llms.txt'), `# ${cfg.name}

> Продаж промислових дизельних генераторів EDON на 30–200 кВт в Україні. Безкоштовна доставка до об’єкта, перший запуск фахівцем на місці, навчання персоналу, гарантія 12 місяців. Оплата на рахунок (без ПДВ) або готівкою.${cfg.phone ? ` Телефон і месенджери (Viber, Telegram, WhatsApp, SMS): ${phoneShown}.` : ''}${cfg.email ? ` Пошта: ${cfg.email}.` : ''}${cfg.city ? ` Магазин: ${[cfg.street, cfg.city].filter(Boolean).join(', ')}.` : ''}

## Генератори
${byPower.map(p => `- [${p.fullName}](${u(`generatory/${p.slug}/`)}): ${p.kw} кВт / ${p.kva} кВА, ${bodyName(p)}, ${p.ats ? 'АВР у комплекті' : 'без АВР'}, ${p.weight} кг, ${plain(price(p.price))}, ${stockText(p).toLowerCase()}`).join('\n')}

## Покупцям
- [Доставка й оплата](${u('dostavka-i-oplata/')})
- [Гарантія й повернення](${u('harantiia-ta-povernennia/')})
- [Публічна оферта](${u('oferta/')})
- [Контакти й реквізити](${u('kontakty/')})
`);

const need = [
  ['domain', 'домен сайту (canonical, sitemap.xml, фід Merchant Center)'],
  ['phone', 'телефон'], ['email', 'ел. пошта'], ['legalName', 'юридична назва продавця'],
  ['formEndpoint', 'адреса сервісу форм (Formspree, Web3Forms...): без неї форма відкриває пошту відвідувача з готовим листом'],
  ['googleAdsId', 'ідентифікатор Google Ads (AW-...) для конверсій'],
].filter(([k]) => !cfg[k]);
console.log(`build: index + ${byPower.length} product pages + 6 buyer pages + 404, robots.txt, llms.txt${domain ? ', sitemap.xml, merchant-feed.xml' : ''}`);
if (need.length) console.log(`site.json is missing:\n${need.map(([k, t]) => `  - ${k}: ${t}`).join('\n')}`);
