---
'@oztix/roadie-components': minor
'@oztix/roadie-widgets': patch
---

Add a `@oztix/roadie-components/css` Tailwind source-registration entry.

Tailwind v4 ignores `node_modules` by default, so consumers previously had to
hand-write `@source "../../node_modules/@oztix/roadie-components/dist"` (a path
that breaks when `globals.css` moves). Now import one line instead — the package
ships its own `@source` relative to itself:

```css
@import '@oztix/roadie-core/css';
@import '@oztix/roadie-components/css';
```

Each package's CSS registers only its own classes, so import every package you
use. The **React** widget skins render Roadie components (Button, Popover, …), so
React consumers add `@oztix/roadie-components/css` alongside
`@oztix/roadie-widgets/css`; the **Vue** skins use core classes only and don't.
