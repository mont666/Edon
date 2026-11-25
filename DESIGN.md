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

Buttons and cards lift on hover (2–4px), product photos zoom 1.04 inside their card. Nothing animates on
scroll; everything rests under `prefers-reduced-motion`.

## Copy rules (Google Ads)

Only facts from `data/`: prices, stock, delivery 0 ₴, first start and training on site, 12-month
warranty, payment with VAT, without VAT or cash. No "cheapest", no counters, no invented reviews.
We are a dealer of EDON, not the maker.
