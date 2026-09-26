---
'@oztix/roadie-components': patch
'@oztix/roadie-widgets': patch
---

`ThemeProvider`, `getAccentStyleSync` and the cart drawer's accent theming cap
the accent's chroma to what sRGB can show at step 9, through
`getAccentChromaSync` from `@oztix/roadie-core/colors`. A saturated green or
cyan accent no longer renders its strong fill too light for white text.
