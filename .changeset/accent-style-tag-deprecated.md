---
'@oztix/roadie-components': minor
---

Deprecate `getAccentStyleTag`. It now resolves to the same tag as `getAccentStyleTagSync`, which sets only the accent's hue and chroma, so use that instead. `ThemeProvider` no longer writes hex colour scales for browsers without `oklch()`, which are below Roadie's browser floor (Chrome 111, Safari 16.4, Firefox 128).
