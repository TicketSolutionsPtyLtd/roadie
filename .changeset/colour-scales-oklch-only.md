---
'@oztix/roadie-core': minor
---

Breaking: drop the hex copy of every colour scale step from `@oztix/roadie-core/css`, as Roadie now supports only the browsers Tailwind CSS v4 does: Chrome 111, Safari 16.4, Firefox 128, and later. Those browsers draw the `oklch()` values, so no colour changes in them, and an app's sheet is about 7.7 kB smaller before compression (1.2 kB with brotli). An older browser shows the page without Roadie's colours.

The token manifest no longer gives a colour step a `fallback` hex. Read its `light` and `dark` values instead.
