---
"@oztix/roadie-widgets": minor
---

Cart drawer — Website visual + theme parity across both skins.

**Theming (both skins now themeable like the Website):**
- The Vue skin's `--rc-*` colour tokens bridge to roadie-core ambient tokens
  (`var(--background-color-raised, …)`, `var(--color-accent-9, …)`, etc.), so
  the drawer inherits the collection accent (via `--accent-hue`) and dark mode
  (roadie tokens swap under `.dark`) — matching the React skin, which already
  inherits via roadie utility classes.
- New `useRoadieTheme(accentColor)` Vue composable mirrors React's
  `ThemeProvider`: derives OKLCH hue/chroma from a hex and writes
  `--accent-hue`/`--accent-chroma` to `:root`, so a Vue app can apply a
  collection theme the same way the Website does. Reuses core's sync OKLCH
  helpers — no new dependency.

**Visual parity (both skins):**
- Mobile shell morph — full-bleed flush-bottom with top-only rounding on
  mobile, floating card from `sm` up (was always floating).
- Spacing aligned to the Website (outer/section/ticket gaps); React drops a
  redundant wrapper and gains an opt-in `roundedDayHeaders` prop.
- Vue footer now has the progress-driven lift shadow the React skin already had.
- Centered empty state (icon, heading, prose) on both skins.
- Vue motion (`bounce`/`pop`) gated behind `prefers-reduced-motion`.
