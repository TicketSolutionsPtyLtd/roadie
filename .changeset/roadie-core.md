---
'@oztix/roadie-core': minor
---

`emphasis-overlay` now adapts to the active intent. Its scrim is built from the
intent hue (`oklch(0.1 0.04 var(--intent-hue) / 0.55)`) instead of a fixed
`rgba(0,0,0,0.5)`, so `intent-danger emphasis-overlay` reads as a dark red glass,
`intent-accent` as a dark accent glass, etc. — while `neutral` stays a near-black
scrim. The lightness is fixed so it remains a proper scrim in both light and dark
themes (the intent scale flips between them).
