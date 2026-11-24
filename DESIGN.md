# Дизель Резерв — design system

**Idea: the product datasheet.** An industrial dealer sells a machine people pay 320 000–1 239 000 ₴ for.
The page reads like the nameplate and spec sheet of that machine: dark graphite like a generator room,
one signal colour (amber, the colour of a control-panel lamp), the real EDON machine big, numbers set in a
monospace face, thin technical leader lines. Calm, exact, no decoration that is not information.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--dark` | `#0E0F11` | hero, calculator, contact, footer grounds |
| `--dark-2` / `--dark-3` | `#17191C` / `#202328` | cards and fields on dark |
| `--on-dark` / `--on-dark-2` | `#F2F1EE` / `#B9BCC1` | text on dark (16:1 / 9:1) |
| `--paper` | `#F3F1EC` | light sections |
| `--card` | `#FFFFFF` | product cards on paper |
| `--ink` / `--ink-2` | `#121315` / `#3A3D42` | text on paper (17:1 / 10:1) |
| `--muted` | `#5D6167` | labels on paper (5.6:1) |
| `--amber` | `#FFB01F` | primary buttons, active states, the one accent; text on it is `--ink` |
| `--ok` | `#2FB36B` | the "in stock" dot only |
| radius | 14 / 10 / 999 | cards / buttons and fields / chips |

Brand marks (Viber, Telegram, WhatsApp) keep their own colours; nothing else is coloured.

## Type

- **Geologica** (300–700) for headings and text. Headings 600, tracking −0.02em; body 400, 17/1.6.
- **Martian Mono** (400–500) for every number with a unit, prices, spec labels and small caps labels
  (12px, uppercase, tracking 0.08em). Large power numerals are Martian Mono 300.
- Scale: h1 clamp(40px, 5.4vw, 76px); h2 clamp(32px, 4.2vw, 56px); h3 22px; lead 20px; body 17px; small 14px.

## Layout

- One wrap: 1280px, side gutter clamp(16px, 4vw, 48px); 12-column grid with 24px gaps.
- Sections alternate dark and paper; vertical padding clamp(64px, 9vw, 128px).
- The product always on a white card or the dark stage, whole, never cropped.

## Motion

Buttons lift 1px on hover and press on click (120ms). Cards lift 2px. The model switch swaps
panels instantly; the load gauge marker slides (200ms). Nothing animates on scroll. Everything rests
under `prefers-reduced-motion`.

## Copy rules (Google Ads)

Only facts from `data/`: prices, stock, delivery 0 ₴, first start and training on site, 12-month
warranty, payment with VAT, without VAT or cash. No "cheapest", no counters, no invented reviews.
We are a dealer of EDON, not the maker.
