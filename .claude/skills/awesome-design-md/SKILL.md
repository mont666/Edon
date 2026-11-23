---
name: awesome-design-md
description: Library of 80+ ready-made DESIGN.md design systems (colors, typography scale, spacing, radii, shadows, components, dark mode) analysed from well-known product sites — Stripe, Linear, Vercel, Apple, Notion, Airbnb, Figma, Framer, Supabase, Raycast, Tesla, Nike, Spotify and more. Use when starting a new site or UI and the user wants it "like X", needs a concrete design system / design tokens / DESIGN.md, asks for a visual direction, or when you need a strong, coherent reference instead of inventing generic styles.
---

# Awesome DESIGN.md

A local copy of [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (MIT).
Each `brands/<name>/DESIGN.md` is a full design system written for agents: YAML front matter with
tokens (colors, typography, spacing, radii, shadows) followed by prose on layout, components,
imagery, motion and do/don't rules.

Available brands: run `ls .claude/skills/awesome-design-md/brands/` (paths are relative to the project root).

## When to use

- The user names a reference ("make it feel like Linear / Stripe / Apple").
- A new project needs a design system and nobody supplied one.
- The current UI looks generic and needs one coherent direction.

## Workflow

1. **Pick 1–2 references** that fit the product type and audience (fintech → stripe, mercury, wise,
   revolut; dev tools → linear.app, vercel, raycast, warp, supabase, sentry; AI → claude, x.ai,
   cohere, mistral.ai, elevenlabs, runwayml; consumer/retail → airbnb, nike, spotify, starbucks;
   editorial → wired, theverge; premium hardware/auto → apple, tesla, ferrari, bmw, dji, oura).
   If the user named one, use it. Otherwise propose 2–3 and pick the best-fitting one yourself.
2. **Read the whole `DESIGN.md`** for the chosen brand(s) — tokens *and* prose rules.
3. **Write the project's own `DESIGN.md`** at the project root: adapt the tokens to the client's
   brand colour, content and audience. Blend at most two references; keep one dominant.
4. **Implement tokens first** (CSS custom properties / Tailwind theme), then components, then pages.
   Every colour, font size, radius and shadow in code should map to a token.
5. **Verify** in a real browser (playwright-cli / webapp-testing skills) at 1440, 768 and 390 px,
   light and dark.

## Rules

- These are *inspired-by* analyses. Use them for direction, rhythm and token structure —
  never copy logos, brand names, trademarked illustrations, product photography or exact copy, and
  never build a page that could pass as the real company's site.
- Proprietary fonts named in a file (Söhne, SF Pro, Circular…) are usually not licensed for the
  client: substitute a close Google Font / open-source equivalent and note it.
- Combine with `design-taste-frontend` and `ui-ux-pro-max` for layout and UX rules, and run
  `web-design-guidelines` + `accessibility` as the final review.
