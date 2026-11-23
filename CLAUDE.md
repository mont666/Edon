# Edon — web design workspace

This repo ships a curated set of Claude Code skills in `.claude/skills/` (and GEO sub-agents in
`.claude/agents/`) for building, auditing and optimising websites. They load automatically in any
Claude Code session opened in this repo. Script paths inside skills are relative to the repo root.

## Default workflow for a new site or page

1. **Direction** — `awesome-design-md` (pick a reference design system, write the project's own
   `DESIGN.md`) + `ui-ux-pro-max` (palette, font pairing, style, UX rules for the product type).
2. **Build** — `design-taste-frontend` (anti-generic layout, copy, photos, motion, finish gate);
   `image-to-code` when the user gives a screenshot/mockup; `vercel-react-best-practices` for
   React/Next.js; `copywriting` + `cro` for page copy and conversion.
3. **Verify in a real browser** — `playwright-cli` or `webapp-testing` at 1440 / 768 / 390 px,
   check console errors, overflow, broken images.
4. **Review** — `web-design-guidelines`, `accessibility`, `best-practices`.
5. **Speed** — `core-web-vitals`, `performance` (or `web-quality-audit` for everything at once).
6. **Search** — `seo`, `seo-audit`, `schema`, `site-architecture`, `programmatic-seo`.
7. **AI search (GEO/AEO)** — `ai-seo`, `geo` (+ `geo-audit`, `geo-citability`, `geo-llmstxt`,
   `geo-crawlers`, `geo-schema`, `geo-technical`, `geo-content`, `geo-platform-optimizer`,
   `geo-brand-mentions`, `geo-report`).

## Notes

- `design-taste-frontend` registers a Stop hook that runs its `scripts/gate.mjs` (Node 22+).
- `playwright-cli` needs the CLI: `npm i -g @playwright/cli`. Chromium is preinstalled in cloud
  sessions — do not run `playwright install`.
- GEO scripts need Python deps: `pip install -r .claude/skills/geo/requirements.txt`.
- Sources and licences: see `.claude/skills/SOURCES.md`.
