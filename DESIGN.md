# Дизель Резерв — design system

**Idea: a confident industrial shop.** Bright, selling, trustworthy: white ground, one energetic orange for every
action, deep navy for trust bands, the real EDON machines big on light cards, prices large, "in stock" badges,
the phone always one tap away.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` / `--soft` | `#FFFFFF` / `#F4F6FA` | page and alternate sections, product card backdrops |
| `--ink` / `--ink-2` / `--muted` | `#0B1426` / `#3C4860` / `#5A6478` | text |
| `--navy` / `--navy-2` | `#0B1F3A` / `#12294A` | trust bar, calculator, ATS, contact, footer |
| `--orange` | `#FF6A00` | buttons (dark text on it, 7:1), hero panel, icon tiles |
| `--orange-ink` / `--orange-big` | `#B83E00` / `#E25300` | orange text on white: labels (4.5:1+), large headline accents (3:1+) |
| `--ok` | `#0E6B3D` on `#E6F6ED` | "in stock" badges and checks |
| radius | 18 / 12 / 999 | cards / buttons and fields / pills |

## Type

**Manrope** 400–800 for everything. Headings 800 with tight tracking; prices 800; body 500, 17/1.6.

## Components

Hero (copy + price + two big buttons + checks; the 200 kW machine on an orange panel with floating badges),
navy trust bar (4 icons), catalog of product cards (badge, photo, spec tags, big price, Buy / Details) plus a navy
"help me choose" card, why-us icon tiles, power calculator (navy with a white result card), steps, payment
cards, ATS schematic, comparison table, FAQ cards, contact + order form (white card on navy).

## Motion

Every animation has a job; curves are ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`), on-screen moves ease-in-out
(`cubic-bezier(0.77, 0, 0.175, 1)`), sheets use the drawer curve (`cubic-bezier(0.32, 0.72, 0, 1)`). Only
transform, opacity, clip-path and the `translate` property move; hover effects run only on real pointers.

| Where | What | Why |
| --- | --- | --- |
| Hero, on load | words rise in turn (60–70 ms stagger), the orange panel settles, the machine lands with a short blur, badges pop; a slow light sheen crosses the panel every 7 s | first impression, once |
| Hero, pointer | layers drift a few px with a soft spring (`translate`) | depth on desktop only |
| Sections | each block rises 22 px once as it enters the view, 70 ms stagger | pace while scrolling; nothing is hidden without JS |
| Catalog | filter/sort cards glide to their new places (FLIP, 420 ms) | spatial continuity |
| Buy | toast from the bottom, the model field flashes twice | feedback: what was added and where |
| Calculator | recommendation swaps with a 280 ms blur, gauge clips, slider fill follows | state change without a hard cut |
| Form | busy spinner, a "still sending" line after 5 s, a check that draws itself on success | feedback during a slow mail service |
| Page to page | the generator photo flies from its card to its page (cross-document View Transitions) | continuity between catalog and product |
| Header, menu | shadow after 8 px of scroll, nav underline on the section in view, burger morphs into a cross, sheet slides 12 px with staggered links | orientation |

Under `prefers-reduced-motion: reduce` nothing moves: no entrance, no reveals, no view transitions.

## Copy rules (Google Ads)

Only facts from `data/`: prices, stock, delivery 0 ₴, first start and training on site, 12-month
warranty, payment by bank transfer without VAT or cash (no VAT invoices). No "cheapest", no counters, no invented reviews.
We are a dealer of EDON, not the maker.
