---
'@oztix/roadie-core': patch
---

`getContrastColor` no longer imports `colorjs.io`, so an app that imports `ThemeProvider` or the synchronous helpers in `@oztix/roadie-core/colors` no longer loads it up front. In an esbuild build, `ThemeProvider`'s first load drops from 32.5 kB to 4.1 kB brotli; Vite and rolldown already loaded `colorjs.io` on demand, and still do for the generated hex scales. It returns the same answer as before for every hex colour (`#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa`). It now reads a hex only: a named colour or a CSS function such as `rgb()` or `oklch()`, which it used to accept, throws a `TypeError`.
