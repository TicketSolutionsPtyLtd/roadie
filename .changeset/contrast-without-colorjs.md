---
'@oztix/roadie-core': minor
---

Breaking: `getContrastColor` now reads a hex colour only (`#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa`), and gives the same answer as before for every one. A named colour or a CSS function such as `rgb()` or `oklch()`, which it used to accept, now throws a `TypeError`. In return it no longer loads `colorjs.io`, so an app that imports `ThemeProvider` or the synchronous helpers in `@oztix/roadie-core/colors` doesn't load it up front: in an esbuild build, `ThemeProvider`'s first load drops from 32.9 kB to 4.2 kB brotli. Vite and rolldown already loaded `colorjs.io` on demand, and still do for the generated hex scales.
