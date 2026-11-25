---
'@oztix/roadie-core': minor
---

Breaking: drop the hex and rgba copies of Roadie's colours from `@oztix/roadie-core/css` (every colour scale step, the shadows and the text field's edge), as Roadie now supports only the browsers Tailwind CSS v4 does: Chrome 111, Safari 16.4, Firefox 128, and later. Those browsers draw the `oklch()` and `color-mix()` values, so nothing changes in them, and an app's sheet is about 8.5 kB smaller before compression (1.3 kB with brotli). An older browser shows the page without most of Roadie's colours and shadows: only the neutral and accent hex scales `ThemeProvider` writes for it remain.

A shadow utility with an opacity modifier, such as `shadow-md/50`, now draws the tinted shadow and ignores the modifier, like `shadow-md`. It drew the untinted rgba copy before.

The token manifest no longer gives a colour step a `fallback` hex. Read its `light` and `dark` values instead.
