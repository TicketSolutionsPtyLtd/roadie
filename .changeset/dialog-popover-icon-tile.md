---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
---

Add Dialog, Popover, and IconTile components.

- **Dialog** / **Popover** — `@base-ui/react` compounds with `*.Content` shortcuts, `Header`/`Body`/`Footer`, and an `intent` variant on the popup. Dialog adds `sm`/`md`/`lg` sizes; Popover adds `Arrow`, `positionerProps` placement, and `openOnHover`.
- **IconTile** — a tile that frames a single Phosphor icon, with `xs`–`3xl` sizes, `intent`/`emphasis` variants, and `square` (default) / `circle` shapes.
- **core**: new `layering.css` z-index token scale (`z-(--z-overlay)`, `z-(--z-modal)`, `z-(--z-popover)`, …), reusable `motion-scale` / `motion-slide` enter/exit utilities in `motion.css`, and a `--rim-light-edge` token in `elevation.css`.
