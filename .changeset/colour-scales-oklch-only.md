---
'@oztix/roadie-core': minor
---

Breaking: drop the hex and rgba copies of Roadie's colours from `@oztix/roadie-core/css` (every colour scale step and the shadows), and the text field edge's fallback, as Roadie now supports only the browsers Tailwind CSS v4 does: Chrome 111, Safari 16.4, Firefox 128, and later. Those browsers draw the `oklch()` and `color-mix()` values, so nothing changes in them, and an app's sheet is about 8.5 kB smaller before compression (1.3 kB with brotli). An older browser shows the page without most of Roadie's colours and shadows: only the neutral and accent hex scales `ThemeProvider` writes for it remain.

The `shadow-*` and `inset-shadow-*` utilities now read Roadie's `--shadow-*` variables the way Tailwind's own utilities do. So an app's own `@theme` value for `--shadow-md` now sets `shadow-md`, and a shadow utility with an opacity modifier, such as `shadow-md/50`, draws the tinted shadow and ignores the modifier. Before, `shadow-md` always drew Roadie's shadow, and `shadow-md/50` drew an untinted rgba copy.

The token manifest no longer gives a colour step a `fallback` hex, and lists the shadow classes under their `--shadow-*` variables rather than as utilities of their own. Read a token's `light` and `dark` values instead.
