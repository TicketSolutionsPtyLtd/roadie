---
'@oztix/roadie-components': minor
---

- **New `@oztix/roadie-components/css`** — a Tailwind source-registration entry.
  Tailwind v4 ignores `node_modules`, so consumers previously hand-wrote
  `@source "../../node_modules/@oztix/roadie-components/dist"` (brittle when
  `globals.css` moves). Now `@import '@oztix/roadie-components/css'` — the package
  ships its own `@source` relative to itself. Each package's CSS registers only
  its own classes, so import every Roadie package you use.
- **`Separator` hairline fix** — it now renders a true 1px line. The base
  `border` applied width to all four sides, so with `h-px` the top and bottom
  both painted (~2px). Colour/style now live in the base and each orientation
  sets a single-side width (`border-t` / `border-l`).
