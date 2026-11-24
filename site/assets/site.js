// Резерв 400: the order form's model picture, a model passed in the URL, and Google Ads conversions.
// Conversions fire only when tools/build.mjs wrote window.SITE_ADS (an Ads id and labels in data/site.json).

const ads = window.SITE_ADS || null;
const track = (label, extra = {}) => {
  if (!ads || !label || typeof window.gtag !== 'function') return;
  window.gtag('event', 'conversion', { send_to: `${ads.id}/${label}`, ...extra });
};

// 1. the picture beside the order form follows the chosen model
const select = document.querySelector('select[data-order-model]');
const pic = document.querySelector('[data-order-pic]');
if (select) {
  const fromUrl = new URLSearchParams(location.search).get('model');
  if (fromUrl && [...select.options].some(o => o.value === fromUrl)) select.value = fromUrl;
  const show = () => {
    const opt = select.selectedOptions[0];
    if (!pic || !opt || !opt.dataset.img) return;
    pic.src = opt.dataset.img;
    pic.alt = opt.dataset.alt || '';
  };
  select.addEventListener('change', show);
  show();
}

// 2. a lead: system.js writes the form's data-sent line into its status only after the endpoint answered 2xx
document.querySelectorAll('form.form[data-endpoint]').forEach(form => {
  const status = form.querySelector('[data-form-status]');
  if (!status) return;
  new MutationObserver(() => {
    if (status.textContent.trim() && status.textContent.trim() === (form.dataset.sent || '').trim()) {
      track(ads && ads.lead);
      if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { currency: 'UAH' });
    }
  }).observe(status, { childList: true, characterData: true, subtree: true });
});

// 3. a call: every tel: link
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href^="tel:"]');
  if (!a) return;
  track(ads && ads.call);
  if (typeof window.gtag === 'function') window.gtag('event', 'click_to_call');
});
