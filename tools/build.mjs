#!/usr/bin/env node
// Builds the Резерв 400 site from data/products.json and data/site.json into site/.
//   node tools/build.mjs
// - fills the <!-- build:NAME --> regions of site/index.html (models, specs, order form, footer, head, analytics)
// - writes a page per generator (site/generatory/<slug>/), the buyer pages, 404, robots.txt, llms.txt,
//   and, once data/site.json has a domain, sitemap.xml and the Google Merchant Center feed.
// Empty fields in site.json are left off the pages; the build lists every one that Google Ads needs.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const products = JSON.parse(readFileSync(join(ROOT, 'data/products.json'), 'utf8'));
const cfg = JSON.parse(readFileSync(join(ROOT, 'data/site.json'), 'utf8'));
const YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString().slice(0, 10);
const domain = (cfg.domain || '').replace(/\/+$/, '');
const abs = p => (domain ? `${domain}/${p}` : '');

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const price = n => `${Math.round(n).toLocaleString('uk-UA').replace(/\s/g, ' ')} ₴`;
const byPower = [...products].sort((a, b) => a.kw - b.kw || (a.body === 'open' ? -1 : 1));
const withAts = byPower.filter(p => p.ats);
const img = p => `assets/img/products/${p.image}.webp`;
const IMG_SIZE = {
  'edon-50-kvt-vidkryta-rama': [478, 281], 'edon-50-kvt-u-kozhusi': [500, 264], 'edon-100-kvt-vidkryta-rama': [488, 309],
  'edon-100-kvt-u-kozhusi': [500, 264], 'edon-150-kvt-vidkryta-rama': [488, 309], 'edon-200-kvt-vidkryta-rama': [493, 267],
  'edon-gj-30gf-30-kvt': [537, 413],
};
const wh = p => { const [w, h] = IMG_SIZE[p.image] || [500, 300]; return `width="${w}" height="${h}"`; };
const bodyName = p => (p.body === 'canopy' ? 'шумозахисний кожух' : 'відкрита рама');
const stockText = p => (p.stock === 'in_stock' ? 'На складі' : 'Під замовлення');
const telHref = () => `tel:${(cfg.phone || '').replace(/[^\d+]/g, '')}`;

// ---------------------------------------------------------------- pieces shared by every page
const navHtml = (pre, onIndex, orderHref = '#order') => {
  const a = id => (onIndex ? `#${id}` : `${pre}#${id}`);
  return `<header class="nav">
  <div class="wrap nav__bar">
    <a class="skip-link" href="#top">Перейти до змісту</a>
    <a class="nav__logo" href="${onIndex ? '#top' : pre || './'}"><span class="mark mark--initial" aria-hidden="true">Р</span>${esc(cfg.name)}</a>
    <nav class="nav__links" aria-label="Головне меню">
      <div class="nav__item"><a class="nav__link" href="${a('models')}">Моделі</a></div>
      <div class="nav__item"><a class="nav__link" href="${a('ats')}">АВР</a></div>
      <div class="nav__item"><a class="nav__link" href="${a('delivery')}">Доставка</a></div>
      <div class="nav__item"><a class="nav__link" href="${a('faq')}">Питання</a></div>
    </nav>
    <div class="nav__actions">
      <a class="btn btn--primary" href="${orderHref}">Замовити генератор</a>
    </div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Меню">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </button>
  </div>
</header>`;
};

const contactItems = (pre) => {
  const out = [];
  if (cfg.phone) out.push(`<li><a href="${telHref()}">${esc(cfg.phoneDisplay || cfg.phone)}</a></li>`);
  if (cfg.email) out.push(`<li><a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></li>`);
  if (cfg.viber) out.push(`<li><a href="${esc(cfg.viber)}">Viber</a></li>`);
  if (cfg.telegram) out.push(`<li><a href="${esc(cfg.telegram)}">Telegram</a></li>`);
  if (cfg.street || cfg.city) out.push(`<li>${esc([cfg.street, cfg.city].filter(Boolean).join(', '))}</li>`);
  if (cfg.hours) out.push(`<li>${esc(cfg.hours)}</li>`);
  out.push(`<li><a href="${pre}kontakty/">Усі контакти</a></li>`);
  return out.join('');
};

const footerLinks = (pre, onIndex) => {
  const a = id => (onIndex ? `#${id}` : `${pre}#${id}`);
  return `    <div class="closing__links">
      <div class="grid">
        <div class="span-4 stack-4">
          <a class="nav__logo" href="${onIndex ? '#top' : pre || './'}">${esc(cfg.name)}</a>
          <p class="footer__lede">Продаж і запуск дизельних генераторів EDON</p>
        </div>
        <div class="span-2 footer__col"><h3>Моделі</h3><ul>
          <li><a href="${pre}generatory/edon-gj-30gf-30-kvt/">30 кВт</a></li>
          <li><a href="${pre}generatory/edon-50-kvt-vidkryta-rama/">50 кВт</a></li>
          <li><a href="${pre}generatory/edon-100-kvt-vidkryta-rama/">100 кВт</a></li>
          <li><a href="${pre}generatory/edon-150-kvt-vidkryta-rama/">150 кВт</a></li>
          <li><a href="${pre}generatory/edon-200-kvt-vidkryta-rama/">200 кВт</a></li>
        </ul></div>
        <div class="span-2 footer__col"><h3>Сервіс</h3><ul>
          <li><a href="${a('ats')}">АВР</a></li>
          <li><a href="${a('delivery')}">Доставка й запуск</a></li>
          <li><a href="${a('specs')}">Характеристики</a></li>
          <li><a href="${a('faq')}">Питання</a></li>
        </ul></div>
        <div class="span-2 footer__col"><h3>Покупцям</h3><ul>
          <li><a href="${pre}dostavka-i-oplata/">Доставка й оплата</a></li>
          <li><a href="${pre}harantiia-ta-povernennia/">Гарантія й повернення</a></li>
          <li><a href="${pre}oferta/">Публічна оферта</a></li>
          <li><a href="${pre}konfidentsiinist/">Конфіденційність</a></li>
        </ul></div>
        <div class="span-2 footer__col"><h3>Контакти</h3><ul class="footer__contacts">${contactItems(pre)}</ul></div>
      </div>
      <div class="footer__legal">
        <span>&copy; ${YEAR} ${esc(cfg.name)}${cfg.legalName ? `, ${esc(cfg.legalName)}` : ''} &nbsp; <a href="${pre}konfidentsiinist/">Конфіденційність</a> &nbsp; <a href="${pre}oferta/">Умови продажу</a></span>
        <div class="socials"></div>
        <a class="credits" href="${pre}credits/">Фотографії: Wikimedia Commons; товари EDON — фото постачальника</a>
      </div>
    </div>`;
};

// the order form: posts to the form service in site.json, else a mailto stand-in
const orderForm = (selected) => {
  const endpoint = cfg.formEndpoint || '';
  const action = endpoint || `mailto:${cfg.fallbackEmail}`;
  const opts = byPower.map(p => `<option value="${p.sku}" data-img="${img(p)}" data-alt="${esc(p.alt)}"${p.slug === selected ? ' selected' : ''}>${esc(p.name)} — ${price(p.price)}</option>`).join('\n          ');
  return `          <form class="form" id="order-form" action="${esc(action)}" method="post"${endpoint ? '' : ' enctype="text/plain"'} data-endpoint="${esc(endpoint)}" data-sent="Заявку на генератор прийнято. Менеджер передзвонить на вказаний номер." data-sending="Надсилаємо" data-failed="Не надіслано: немає з’єднання. Дані залишилися у формі, спробуйте ще раз." data-fix="Виправте полів: {n}." novalidate>
            <div class="field"><label for="f-name">Ім’я</label>
              <input id="f-name" name="name" type="text" autocomplete="name" required aria-describedby="f-name-err">
              <p class="field__error" id="f-name-err" hidden>Напишіть, як до вас звертатися.</p></div>
            <div class="field"><label for="f-phone">Телефон</label>
              <input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required pattern="[+0-9()\\-\\s]{10,}" aria-describedby="f-phone-err">
              <p class="field__error" id="f-phone-err" hidden>Напишіть номер з кодом оператора, наприклад 0XX XXX XX XX.</p></div>
            <div class="field field--full"><label for="f-model">Модель</label>
              <select id="f-model" name="model" data-order-model>
          <option value="">Ще не знаю, допоможіть підібрати</option>
          ${opts}
              </select></div>
            <div class="field field--full"><label for="f-city">Населений пункт</label>
              <input id="f-city" name="city" type="text" autocomplete="address-level2"></div>
            <div class="field field--full"><label for="f-note">Що буде живити генератор</label>
              <textarea id="f-note" name="note" rows="2"></textarea></div>
            <div class="btn-row"><button class="btn btn--primary" type="submit">Замовити генератор</button></div>
            <p class="form__status" role="status" data-form-status></p>
            <p class="form__consent">Надсилаючи заявку, ви погоджуєтеся з <a href="${'{{pre}}'}konfidentsiinist/">політикою конфіденційності</a>. Оплата лише після розрахунку й погодження.</p>
          </form>`;
};

const orderContacts = () => {
  const lines = [];
  if (cfg.phone) lines.push(`<a href="${telHref()}">${esc(cfg.phoneDisplay || cfg.phone)}</a>`);
  if (cfg.email) lines.push(`<a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a>`);
  if (cfg.hours) lines.push(`<span>${esc(cfg.hours)}</span>`);
  return lines.length ? `          <p class="contact-lines">${lines.join('')}</p>` : '';
};

// ---------------------------------------------------------------- structured data (schema.org)
const sellerLd = () => ({
  '@type': 'Store',
  '@id': abs('#store') || '#store',
  name: cfg.name,
  ...(cfg.legalName ? { legalName: cfg.legalName } : {}),
  ...(domain ? { url: `${domain}/` } : {}),
  ...(cfg.phone ? { telephone: cfg.phone } : {}),
  ...(cfg.email ? { email: cfg.email } : {}),
  ...(cfg.city ? { address: { '@type': 'PostalAddress', addressCountry: 'UA', addressLocality: cfg.city, ...(cfg.street ? { streetAddress: cfg.street } : {}) } } : {}),
  areaServed: { '@type': 'Country', name: 'Україна' },
  description: 'Продаж промислових дизельних генераторів EDON 30–200 кВт з безкоштовною доставкою по Україні, запуском на об’єкті та навчанням персоналу.',
  ...(domain ? { image: `${domain}/share.jpg` } : {}),
  priceRange: `${price(byPower[0].price)}–${price(byPower.at(-1).price)}`.replace(/ /g, ' '),
});
const shippingLd = {
  '@type': 'OfferShippingDetails',
  shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'UAH' },
  shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'UA' },
};
const returnLd = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'UA',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 14,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/FreeReturn',
  ...(domain ? { merchantReturnLink: `${domain}/harantiia-ta-povernennia/` } : {}),
};
const productLd = p => ({
  '@type': 'Product',
  name: p.fullName,
  sku: p.sku,
  mpn: p.sku,
  brand: { '@type': 'Brand', name: 'EDON' },
  category: 'Дизельні генератори',
  description: `${p.lead} ${p.fit}`,
  image: domain ? [`${domain}/assets/img/products/${p.image}.jpg`] : [`assets/img/products/${p.image}.jpg`],
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
    '@type': 'Offer',
    price: p.price,
    priceCurrency: 'UAH',
    availability: p.stock === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
    itemCondition: 'https://schema.org/NewCondition',
    ...(domain ? { url: `${domain}/generatory/${p.slug}/` } : {}),
    seller: { '@id': abs('#store') || '#store' },
    shippingDetails: shippingLd,
    hasMerchantReturnPolicy: returnLd,
  },
});
const ldScript = obj => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...obj })}</script>`;

// ---------------------------------------------------------------- head extras: canonical, verification, analytics
const headExtra = (path, ld) => {
  const out = [];
  if (domain) out.push(`<link rel="canonical" href="${domain}/${path}">`, `<meta property="og:url" content="${domain}/${path}">`);
  if (cfg.googleSiteVerification) out.push(`<meta name="google-site-verification" content="${esc(cfg.googleSiteVerification)}">`);
  if (ld) out.push(ldScript(ld));
  return out.join('\n');
};
const analytics = () => {
  const ids = [cfg.googleAdsId, cfg.ga4Id].filter(Boolean);
  if (!ids.length) return '';
  const ads = cfg.googleAdsId ? `window.SITE_ADS=${JSON.stringify({ id: cfg.googleAdsId, lead: cfg.googleAdsLeadLabel || '', call: cfg.googleAdsCallLabel || '' })};` : '';
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(ids[0])}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('consent','default',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});
gtag('js',new Date());${ids.map(id => `gtag('config','${esc(id)}');`).join('')}${ads}</script>`;
};

// ---------------------------------------------------------------- regions in index.html
const region = (html, name, content) => {
  const re = new RegExp(`(<!-- build:${name} -->)[\\s\\S]*?(<!-- /build:${name} -->)`);
  if (!re.test(html)) throw new Error(`index.html has no region ${name}`);
  return html.replace(re, `$1\n${content}\n$2`);
};

const tile = (p, pre = '') => `          <a class="tile tile--product span-4" href="${pre}generatory/${p.slug}/">
            <div class="tile__media"><img src="${pre}${img(p)}" srcset="${pre}assets/img/products/${p.image}-240.webp 240w, ${pre}${img(p)} ${IMG_SIZE[p.image] ? IMG_SIZE[p.image][0] : 500}w" sizes="(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 410px" alt="${esc(p.alt)}" ${wh(p)} loading="lazy" decoding="async" data-source="supplier" data-subject="${esc(p.sku)}"></div>
            <div class="tile__head"><h3>${esc(p.name)}</h3><span class="tile__price">${price(p.price)}</span></div>
            <p class="tile__facts"><span class="stock">${stockText(p)}</span> · ${p.kva}&nbsp;кВА · ${p.cylinders}&nbsp;циліндри · ${p.weight}&nbsp;кг</p>
          </a>`;

const modelsHtml = () => `      <div class="group">
        <div class="section-head">
          <h2 id="models-h">Генератори EDON 50–200 кВт з АВР. <span class="muted">Усі шість моделей на складі.</span></h2>
        </div>
        <div class="grid">
${withAts.slice(0, 3).map(p => tile(p)).join('\n')}
        </div>
      </div>
      <div class="grid">
${withAts.slice(3, 6).map(p => tile(p)).join('\n')}
      </div>`;

const specsHtml = (pre = '') => `        <table class="spec-table">
          <thead><tr><th scope="col">Модель</th><th scope="col">Потужність</th><th scope="col">Двигун</th><th scope="col">Пальне</th><th scope="col">Вага</th><th scope="col">АВР</th><th scope="col">Ціна</th></tr></thead>
          <tbody>
${byPower.map(p => `            <tr><th scope="row"><a href="${pre}generatory/${p.slug}/">${esc(p.name)}</a></th><td class="num" data-label="Потужність:">${p.kw} кВт / ${p.kva} кВА</td><td data-label="Двигун:">${p.cylinders} циліндри</td><td class="num" data-label="Пальне:">${esc(p.fuelShort)}</td><td class="num" data-label="Вага:">${p.weight} кг</td><td data-label="АВР:">${p.ats ? 'у комплекті' : 'окремо'}</td><td class="num" data-label="Ціна:">${price(p.price)}</td></tr>`).join('\n')}
          </tbody>
        </table>`;

const indexLd = () => ({
  '@graph': [
    sellerLd(),
    { '@type': 'WebSite', name: cfg.name, inLanguage: 'uk', ...(domain ? { url: `${domain}/` } : {}) },
    { '@type': 'ItemList', name: 'Дизельні генератори EDON у наявності', itemListElement: byPower.map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: productLd(p) })) },
  ],
});

let index = readFileSync(join(SITE, 'index.html'), 'utf8');
index = region(index, 'head', headExtra('', indexLd()));
index = region(index, 'models', modelsHtml());
index = region(index, 'specs', specsHtml());
index = region(index, 'order-contacts', orderContacts());
index = region(index, 'order-form', orderForm('').replaceAll('{{pre}}', ''));
index = region(index, 'footer', footerLinks('', true));
index = region(index, 'analytics', analytics());
writeFileSync(join(SITE, 'index.html'), index);

// ---------------------------------------------------------------- inner pages
const HEAD_COMMON = pre => `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${pre}assets/system.css">
<link rel="stylesheet" href="${pre}assets/ui/cards.css">
<link rel="stylesheet" href="${pre}assets/motion/motion.css">
<link rel="stylesheet" href="${pre}assets/layout/layout.css">
<style>
:root {
  --p-bg: #dfdedb; --p-surface: #d3d2ce; --p-ink: #26251e; --p-muted: #5a5850;
  --p-accent: #2456d6; --p-accent-ink: #ffffff; --p-action: #2456d6; --p-action-ink: #ffffff;
  --p-inv-bg: #26251e; --p-inv-surface: #313029; --p-inv-ink: #dfdedb; --p-inv-muted: #9e9d99;
  --p-inv-accent: #dfdedb; --p-inv-accent-ink: #26251e; --p-inv-action: #dfdedb; --p-inv-action-ink: #26251e;
  --font-display: "Geist", system-ui, sans-serif; --font-text: "Geist", system-ui, sans-serif;
  --display-weight: 400; --display-tracking: -0.035em; --display-tracking-xl: -0.045em;
}
</style>
<link rel="stylesheet" href="${pre}assets/site.css">`;

const page = ({ path, title, description, body, ld, ogImage, robots = 'index, follow, max-image-preview:large', hasOrder = false }) => {
  const depth = path ? path.split('/').filter(Boolean).length : 0;
  const pre = '../'.repeat(depth);
  const html = `<!doctype html>
<html lang="uk" data-type="product" data-radius="soft" data-buttons="block" data-motion class="page-flow">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
<meta property="og:type" content="${ld && ld['@type'] === 'Product' ? 'product' : 'website'}">
<meta property="og:locale" content="uk_UA">
<meta property="og:site_name" content="${esc(cfg.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${ogImage ? (domain ? `${domain}/${ogImage}` : pre + ogImage) : (domain ? `${domain}/share.jpg` : `${pre}share.jpg`)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${pre}favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#dfdedb">
<meta name="site-kind" content="other">
<meta name="page-type" content="product">
${headExtra(path ? `${path}/` : '', ld)}
${HEAD_COMMON(pre)}
</head>
<body>
${navHtml(pre, false, hasOrder ? '#order' : `${pre}#order`)}
<main id="top">
${body.replaceAll('{{pre}}', pre)}
</main>
<footer class="footer closing footer--flow" id="contact">
  <div class="wrap">
${footerLinks(pre, false)}
  </div>
</footer>
<nav class="actionbar" aria-label="Швидкі дії">
  <a class="btn btn--primary" href="${hasOrder ? '#order' : `${pre}#order`}">Замовити генератор</a>
</nav>
<script type="module" src="${pre}assets/system.js"></script>
<script type="module" src="${pre}assets/motion/motion.js"></script>
<script type="module" src="${pre}assets/site.js"></script>
${analytics()}
</body>
</html>
`;
  const file = join(SITE, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
};

const crumbs = (pre, items) => `<nav class="crumbs" aria-label="Навігаційний ланцюжок"><ol><li><a href="${pre}">Головна</a></li>${items.map(([href, t]) => href ? `<li><a href="${href}">${esc(t)}</a></li>` : `<li aria-current="page">${esc(t)}</li>`).join('')}</ol></nav>`;
const breadcrumbLd = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([url, name], i) => ({ '@type': 'ListItem', position: i + 1, name, ...(url && domain ? { item: `${domain}/${url}` } : {}) })) });

const SIZING = [
  ['Магазин або кафе з холодильними вітринами', 25], ['СТО з підйомниками й компресором', 35], ['Ферма з доїльним залом і вентиляцією', 45],
  ['Цех на 5–8 верстатів до 7,5 кВт', 60], ['Виробництво з кількома лініями', 110], ['Готель або торговий центр', 140], ['Великий холодильний склад', 180],
];
const verdict = (need, kw) => (need <= kw * 0.8 ? 'вистачить із запасом' : need <= kw ? 'на межі' : 'замало');

// product pages
for (const p of byPower) {
  const path = `generatory/${p.slug}`;
  const pre = '{{pre}}';
  const others = byPower.filter(o => o.slug !== p.slug).sort((a, b) => Math.abs(a.kw - p.kw) - Math.abs(b.kw - p.kw)).slice(0, 3);
  const specRows = [
    ['Номінальна потужність', `${p.kw} кВт / ${p.kva} кВА`], ['Напруга', '400/230 В, три фази'], ['Частота', '50 Гц'], ['Коефіцієнт потужності', 'cos φ 0,8'],
    ['Двигун', p.engine], ['Запуск', p.ats ? 'електростартер; автоматично через АВР' : 'електростартер 12 В, вручну'],
    ['АВР', p.ats ? 'у комплекті' : 'підбираємо окремо'], ['Витрата пального', p.fuel],
    ...(p.insulation ? [['Клас ізоляції обмотки', p.insulation]] : []), ...(p.ip ? [['Ступінь захисту', p.ip]] : []),
    ['Виконання', bodyName(p)], ...(p.noise ? [['Рівень шуму', p.noise]] : []), ...(p.dims ? [['Габарити', p.dims]] : []),
    ['Вага', `${p.weight} кг`], ['Гарантія', '12 місяців'], ['Артикул', p.sku],
  ];
  const body = `  <section class="section" aria-labelledby="pp-h">
    <div class="wrap">
      ${crumbs(pre, [[`${pre}#models`, 'Генератори'], [null, p.name]])}
      <div class="grid grid--top">
        <div class="frame pp-frame span-7"><img src="${pre}${img(p)}" alt="${esc(p.alt)}" ${wh(p)} fetchpriority="high" decoding="async" data-source="supplier" data-subject="${esc(p.sku)}"></div>
        <div class="span-5 stack-4">
          <h1 id="pp-h" class="t-h2">${esc(p.fullName)}</h1>
          <p class="pp-price">${price(p.price)}</p>
          <p class="pp-stock">${stockText(p)}</p>
          <p>${esc(p.lead)}</p>
          <ul class="rows rows--spec">
            <li><span class="rows__name">Потужність</span><span class="rows__value">${p.kw} кВт / ${p.kva} кВА</span></li>
            <li><span class="rows__name">АВР</span><span class="rows__value">${p.ats ? 'у комплекті' : 'окремо'}</span></li>
            <li><span class="rows__name">Вага</span><span class="rows__value">${p.weight} кг</span></li>
          </ul>
          <div class="btn-row"><a class="btn btn--primary" href="#order">Замовити генератор</a><a class="btn btn--secondary" href="${pre}#specs">Порівняти моделі</a></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="inc-h">
    <div class="wrap">
      <div class="grid grid--top">
        <div class="span-5 stack-4">
          <h2 id="inc-h" class="t-h3">Що входить у ціну</h2>
          <p>${esc(p.fit)}</p>
        </div>
        <ul class="rows span-6 start-7">
          <li><span class="rows__name">Доставка до вашого об’єкта по Україні</span><span class="rows__value">безкоштовно</span></li>
          <li><span class="rows__name">Перший запуск фахівцем на місці</span><span class="rows__value">входить</span></li>
          <li><span class="rows__name">Навчання персоналу</span><span class="rows__value">входить</span></li>
          <li><span class="rows__name">Гарантія, сервіс і запчастини</span><span class="rows__value">12 місяців</span></li>
          <li><span class="rows__name">Оплата</span><span class="rows__value">готівкою при запуску або за рахунком</span></li>
        </ul>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="spec-h">
    <div class="wrap">
      <div class="grid grid--top">
        <div class="span-5 stack-4">
          <h2 id="spec-h" class="t-h3">Технічні характеристики</h2>
          <p>Дані виробника для цієї партії. Перед оплатою менеджер звіряє комплектацію з вашим об’єктом.</p>
        </div>
        <ul class="rows rows--spec span-6 start-7">
          ${specRows.map(([k, v]) => `<li><span class="rows__name">${esc(k)}</span><span class="rows__value">${esc(v)}</span></li>`).join('\n          ')}
        </ul>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="fit-h">
    <div class="wrap">
      <div class="grid grid--top">
        <div class="span-5 stack-4">
          <h2 id="fit-h" class="t-h3">Які об’єкти закриє ${p.kw} кВт</h2>
          <p>Орієнтовні піки навантаження. Точну потужність рахуємо за переліком вашого обладнання з урахуванням пускових струмів, безкоштовно.</p>
        </div>
        <ul class="rows span-6 start-7">
          ${SIZING.map(([t, kw]) => `<li><span class="rows__name">${esc(t)}, ≈ ${kw} кВт</span><span class="rows__value verdict">${verdict(kw, p.kw)}</span></li>`).join('\n          ')}
        </ul>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="prep-h">
    <div class="wrap">
      <div class="grid grid--top">
        <div class="span-5 stack-4">
          <h2 id="prep-h" class="t-h3">Що підготувати до запуску</h2>
          <p>Генератор важить ${p.weight} кг. Розвантаження навантажувачем або маніпулятором узгоджуємо заздалегідь.</p>
        </div>
        <ul class="rows span-6 start-7">
          <li><span class="rows__name">Рівний бетонний майданчик або фундамент</span><p>Машина вібрує, на ґрунт чи асфальт її не ставлять.</p></li>
          <li><span class="rows__name">Вивід вихлопу назовні й приплив повітря</span><p>Без припливу радіатор перегріється навіть узимку.</p></li>
          <li><span class="rows__name">Підключення через АВР або перекидний рубильник</span><p>Пряме підключення до вводу небезпечне для бригад, що ремонтують лінію.</p></li>
          <li><span class="rows__name">Олива, антифриз і акумулятор</span><p>Перелік надішлемо після замовлення. Обкатка — 50 мотогодин на навантаженні 50–70%.</p></li>
        </ul>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="more-h">
    <div class="wrap">
      <h2 id="more-h" class="t-h3">Інші моделі EDON</h2>
      <div class="grid" style="margin-top: var(--s-6)">
${others.map(o => tile(o, pre)).join('\n')}
      </div>
    </div>
  </section>

  <section class="section" id="order" aria-labelledby="order-h">
    <div class="wrap">
      <div class="grid grid--top">
        <div class="span-5 stack-4">
          <h2 id="order-h" class="t-h3">Замовлення ${esc(p.name)}</h2>
          <p>Залиште номер телефону. Менеджер передзвонить, уточнить об’єкт і дату доставки. Оплата лише після погодження.</p>
${orderContacts()}
        </div>
        <div class="order-card span-6 start-7">
${orderForm(p.slug)}
        </div>
      </div>
    </div>
  </section>`;
  page({
    path,
    title: `${p.fullName} — ціна ${price(p.price).replace(/ /g, ' ')} | ${cfg.name}`,
    description: `EDON ${p.kw} кВт (${p.kva} кВА), ${bodyName(p)}${p.ats ? ', АВР у комплекті' : ''}. ${stockText(p)}. Безкоштовна доставка по Україні, запуск на об’єкті й навчання.`,
    body,
    ld: { '@graph': [productLd(p), breadcrumbLd([['', 'Головна'], ['#models', 'Генератори'], [`${path}/`, p.name]])] },
    ogImage: `assets/img/products/${p.image}.jpg`,
    hasOrder: true,
  });
}

// buyer pages: one prose block each
const seller = () => {
  const bits = [];
  if (cfg.legalName) bits.push(esc(cfg.legalName));
  if (cfg.legalCode) bits.push(`код ${esc(cfg.legalCode)}`);
  if (cfg.legalAddress) bits.push(esc(cfg.legalAddress));
  return bits.length ? `<p><strong>Продавець:</strong> ${bits.join(', ')}.</p>` : '';
};
const contactsProse = () => {
  const l = [];
  if (cfg.phone) l.push(`<li>Телефон: <a href="${telHref()}">${esc(cfg.phoneDisplay || cfg.phone)}</a></li>`);
  if (cfg.email) l.push(`<li>Ел. пошта: <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></li>`);
  if (cfg.viber) l.push(`<li><a href="${esc(cfg.viber)}">Viber</a></li>`);
  if (cfg.telegram) l.push(`<li><a href="${esc(cfg.telegram)}">Telegram</a></li>`);
  if (cfg.street || cfg.city) l.push(`<li>Адреса: ${esc([cfg.street, cfg.city].filter(Boolean).join(', '))}</li>`);
  if (cfg.hours) l.push(`<li>Графік: ${esc(cfg.hours)}</li>`);
  l.push(`<li>Заявка на сайті: <a href="{{pre}}#order">форма замовлення</a></li>`);
  return `<ul>${l.join('')}</ul>`;
};
const prosePage = (path, h1, title, description, html) => page({
  path, title: `${title} | ${cfg.name}`, description,
  body: `  <section class="section">
    <div class="wrap">
      ${crumbs('{{pre}}', [[null, h1]])}
      <div class="prose">
        <h1 class="t-h2">${esc(h1)}</h1>
${html}
      </div>
    </div>
  </section>`,
  ld: { '@graph': [breadcrumbLd([['', 'Головна'], [`${path}/`, h1]])] },
});

prosePage('dostavka-i-oplata', 'Доставка й оплата', 'Доставка й оплата генераторів', 'Безкоштовна доставка генераторів EDON по Україні, перший запуск на об’єкті та способи оплати: готівкою при запуску або за рахунком.', `
        <h2>Доставка</h2>
        <p>Доставка будь-якого генератора з каталогу безкоштовна. Ми привозимо його вантажним транспортом до вашого об’єкта на підконтрольній Україні території. Дату й час узгоджує менеджер після замовлення: строк залежить від області та моделі.</p>
        <p>Генератори важать від 500 до 1650 кг. Для розвантаження на об’єкті потрібен навантажувач або маніпулятор; заздалегідь узгодьте під’їзд до місця встановлення. Якщо техніки для розвантаження немає, підкажемо, як її знайти.</p>
        <h2>Перший запуск і навчання</h2>
        <p>Після доставки наш фахівець перевіряє майданчик, вихлоп, вентиляцію та схему підключення, запускає генератор і дає йому навантаження. Потім показує вашому персоналу, як запускати й зупиняти станцію, проходити обкатку (50 мотогодин на навантаженні 50–70%) і щомісяця перевіряти її під навантаженням. Запуск і навчання входять у ціну.</p>
        <p>До запуску підготуйте рівний бетонний майданчик або фундамент, вивід вихлопу назовні, приплив повітря до радіатора та підключення через АВР або перекидний рубильник. Перелік оливи, антифризу й акумулятора надсилаємо після замовлення.</p>
        <h2>Оплата</h2>
        <ul>
          <li>Готівкою нашому фахівцю під час запуску на об’єкті.</li>
          <li>Безготівково за рахунком: для ФОП, ТОВ і бюджетних установ готуємо видаткову накладну та інші документи.</li>
        </ul>
        <p>Ціни на сайті вказані в гривнях і вже включають доставку, перший запуск, навчання й гарантію 12 місяців. Остаточну суму менеджер підтверджує до оплати.</p>
        ${seller()}`);

prosePage('harantiia-ta-povernennia', 'Гарантія й повернення', 'Гарантія та повернення', 'Гарантія 12 місяців на генератори EDON, умови гарантійного ремонту, обміну та повернення товару.', `
        <h2>Гарантія 12 місяців</h2>
        <p>На кожен генератор діє гарантія 12 місяців від дати першого запуску на вашому об’єкті. Протягом цього строку ми безкоштовно усуваємо заводські дефекти: ремонтуємо або замінюємо несправні вузли.</p>
        <p>Гарантія зберігається, якщо генератор встановлено й підключено за вимогами (майданчик, вихлоп, вентиляція, АВР або перекидний рубильник), обкатку й технічне обслуговування проведено за регламентом, а в станцію заливали рекомендовані оливу, антифриз і пальне.</p>
        <p>Гарантія не покриває витратні матеріали (фільтри, оливу, антифриз, акумулятор), пошкодження від неправильного підключення, перевантаження, стихійних лих, механічних ушкоджень і втручання сторонніх осіб.</p>
        <h2>Як звернутися за гарантією</h2>
        <p>Повідомте нам модель, артикул, дату запуску й опис несправності, додайте фото або відео. Ми узгодимо діагностику на місці або доставку вузла в сервіс.</p>
        ${contactsProse()}
        <h2>Обмін і повернення</h2>
        <p>Обмін і повернення товару належної якості для споживачів здійснюються відповідно до Закону України «Про захист прав споживачів» протягом 14 днів, якщо генератор не був у використанні та збережено його товарний вигляд і комплектність. Якщо генератор має недолік, ви маєте права, передбачені статтею 8 цього Закону: ремонт, заміна, зменшення ціни або повернення коштів.</p>
        <p>Повернення коштів здійснюємо тим самим способом, яким було проведено оплату. Для юридичних осіб і ФОП умови повернення визначає договір поставки.</p>
        ${seller()}`);

prosePage('oferta', 'Публічна оферта', 'Публічна оферта', 'Умови продажу дизельних генераторів EDON: замовлення, ціна, оплата, доставка, приймання, гарантія.', `
        <p>Цей документ — пропозиція укласти договір купівлі-продажу генераторів, представлених на сайті, на умовах нижче. Оформлюючи замовлення, покупець погоджується з цими умовами.</p>
        ${seller()}
        <h2>1. Предмет</h2>
        <p>Продавець передає у власність покупця генератор, обраний на сайті або погоджений з менеджером, а покупець приймає та оплачує його. Продавець не є виробником генераторів EDON і продає їх як дилер.</p>
        <h2>2. Замовлення</h2>
        <p>Замовлення оформлюється через форму на сайті або телефоном. Менеджер підтверджує модель, ціну, адресу та дату доставки. Договір вважається укладеним з моменту такого підтвердження.</p>
        <h2>3. Ціна й оплата</h2>
        <p>Ціни вказано в гривнях; вони включають доставку по Україні, перший запуск, навчання персоналу та гарантію 12 місяців. Оплата готівкою під час запуску або безготівково за рахунком. Ціна, підтверджена менеджером, не змінюється після підтвердження замовлення.</p>
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
          <li>З форми замовлення: ім’я, номер телефону, населений пункт, обрана модель і ваш коментар.</li>
          <li>Технічні дані: IP-адреса, тип пристрою й браузера, сторінки, з яких ви прийшли, а також файли cookie, якщо на сайті ввімкнено Google Analytics або Google Ads.</li>
        </ul>
        <h2>Навіщо</h2>
        <ul>
          <li>Щоб зв’язатися з вами, порахувати потужність, оформити доставку, запуск і гарантію.</li>
          <li>Щоб вимірювати ефективність реклами та покращувати сайт (знеособлена статистика).</li>
        </ul>
        <h2>Кому ми передаємо дані</h2>
        <p>Ми не продаємо персональні дані. Дані з форми надходять до нас через сервіс обробки форм, а статистика відвідувань — до Google (Google Analytics, Google Ads), якщо ці сервіси ввімкнені. Перевізнику ми передаємо лише ім’я, телефон і адресу доставки.</p>
        <h2>Скільки зберігаємо</h2>
        <p>Дані заявок зберігаємо до 3 років після останнього контакту або довше, якщо цього вимагає законодавство (бухгалтерські та гарантійні документи).</p>
        <h2>Ваші права</h2>
        <p>Ви можете дізнатися, які дані ми маємо, виправити їх або вимагати видалення, написавши чи зателефонувавши нам. Файли cookie можна видалити або заборонити в налаштуваннях браузера; персоналізацію реклами Google вимикають на сторінці adssettings.google.com.</p>
        ${contactsProse()}`);

prosePage('kontakty', 'Контакти', 'Контакти', `Як зв’язатися з ${cfg.name}: замовлення генераторів EDON, доставка, запуск і гарантія.`, `
        <p>${esc(cfg.name)} продає промислові дизельні генератори EDON на 30–200 кВт, безкоштовно довозить їх по Україні, запускає на об’єкті й навчає персонал. Ми дилер і не є виробником EDON.</p>
        ${contactsProse()}
        ${seller()}`);

prosePage('credits', 'Джерела фотографій', 'Джерела фотографій', 'Ліцензії фотографій, використаних на сайті.', `
        <p>Фотографії генераторів EDON надав постачальник. Фото на першому екрані та в розділі доставки — з Wikimedia Commons за вільними ліцензіями:</p>
        <ul>
          <li>«Paranal generators (paranal-generator-set)», ESO, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, <a href="https://commons.wikimedia.org/wiki/File:Paranal_generators_(paranal-generator-set).jpg">джерело</a>.</li>
          <li>«Blue Grass Chemical Agent-Destruction Pilot Plant Standby Diesel Generator», PEO ACWA, <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>, кадровано, <a href="https://commons.wikimedia.org/wiki/File:Blue_Grass_Chemical_Agent-Destruction_Pilot_Plant_Standby_Diesel_Generator_(12119019006).jpg">джерело</a>.</li>
        </ul>`);

// 404
page({ path: '404-page', title: `Сторінку не знайдено | ${cfg.name}`, description: 'Такої сторінки немає. Перейдіть до каталогу генераторів EDON.', robots: 'noindex, follow', body: `  <section class="section">
    <div class="wrap">
      <div class="prose">
        <h1 class="t-h2">Такої сторінки немає</h1>
        <p>Можливо, модель перейменовано. Усі генератори з цінами — у каталозі.</p>
        <p><a class="btn btn--secondary" href="/#models">Переглянути генератори</a></p>
      </div>
    </div>
  </section>` });
{
  const f = join(SITE, '404-page/index.html');
  const html = readFileSync(f, 'utf8').replaceAll('href="../', 'href="/').replaceAll('src="../', 'src="/');
  writeFileSync(join(SITE, '404.html'), html);
}

// robots, sitemap, merchant feed, llms.txt
const pages = ['', ...byPower.map(p => `generatory/${p.slug}/`), 'dostavka-i-oplata/', 'harantiia-ta-povernennia/', 'oferta/', 'konfidentsiinist/', 'kontakty/'];
writeFileSync(join(SITE, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /404-page/\n\nUser-agent: AdsBot-Google\nAllow: /\n\nUser-agent: AdsBot-Google-Mobile\nAllow: /\n${domain ? `\nSitemap: ${domain}/sitemap.xml\n` : ''}`);
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
  <g:description>${x(`${p.lead} ${p.fit} Безкоштовна доставка по Україні, запуск на об’єкті, навчання персоналу, гарантія 12 місяців.`)}</g:description>
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
writeFileSync(join(SITE, 'llms.txt'), `# ${cfg.name}

> Продаж промислових дизельних генераторів EDON на 30–200 кВт в Україні. Безкоштовна доставка до об’єкта, перший запуск фахівцем на місці, навчання персоналу, гарантія 12 місяців. Оплата готівкою при запуску або за рахунком.

## Генератори
${byPower.map(p => `- [${p.fullName}](${domain ? domain + '/' : ''}generatory/${p.slug}/): ${p.kw} кВт / ${p.kva} кВА, ${bodyName(p)}, ${p.ats ? 'АВР у комплекті' : 'без АВР'}, ${p.weight} кг, ${price(p.price).replace(/ /g, ' ')}, ${stockText(p).toLowerCase()}`).join('\n')}

## Покупцям
- [Доставка й оплата](${domain ? domain + '/' : ''}dostavka-i-oplata/)
- [Гарантія й повернення](${domain ? domain + '/' : ''}harantiia-ta-povernennia/)
- [Публічна оферта](${domain ? domain + '/' : ''}oferta/)
- [Контакти](${domain ? domain + '/' : ''}kontakty/)
`);

// what is still missing for Google Ads (misrepresentation and destination policies)
const need = [
  ['domain', 'домен сайту (canonical, sitemap.xml, фід Merchant Center)'],
  ['phone', 'телефон (Google вимагає реальні контакти бізнесу)'],
  ['email', 'ел. пошта'],
  ['city', 'місто / адреса'],
  ['legalName', 'юридична назва продавця (ФОП або ТОВ)'],
  ['legalCode', 'ЄДРПОУ або РНОКПП продавця'],
  ['formEndpoint', 'адреса сервісу форм (Formspree, Web3Forms...): без неї заявки не надходять'],
  ['googleAdsId', 'ідентифікатор Google Ads (AW-...) для конверсій'],
].filter(([k]) => !cfg[k]);
console.log(`build: index + ${byPower.length} product pages + 6 buyer pages + 404, robots.txt, llms.txt${domain ? ', sitemap.xml, merchant-feed.xml' : ''}`);
if (need.length) console.log(`site.json is missing (left off the pages):\n${need.map(([k, t]) => `  - ${k}: ${t}`).join('\n')}`);
