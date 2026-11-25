---
'@oztix/roadie-core': minor
---

Breaking: drop the hex copy of every colour scale step and chart colour from `@oztix/roadie-core/css`, as Roadie now supports only the browsers Tailwind CSS v4 does: Chrome 111, Safari 16.4, Firefox 128, and later. Those browsers draw the `oklch()` values, so no colour changes in them, and an app's sheet is about 9.4 kB smaller before compression (1.6 kB with brotli). An older browser shows the page without most of Roadie's colours: only the neutral and accent hex scales `ThemeProvider` writes for it remain.

The token manifest no longer gives a token a `fallback` value. Read its `light` and `dark` values instead.
