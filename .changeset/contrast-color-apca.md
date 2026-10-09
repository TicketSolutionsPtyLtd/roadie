---
'@oztix/roadie-core': minor
---

`getContrastColor` from `@oztix/roadie-core/colors` now picks white or black
text by APCA instead of the WCAG 2 contrast ratio, following decision 0010.
Some mid-tone backgrounds return the other colour, always `'white'` where
they used to return `'black'`. For example, `getContrastColor('#0091EB')`
returned `'black'` and now returns `'white'` (white measures Lc 65.7 there,
black Lc 43.8). The shipped scales that flip are step 9 of neutral (light),
accent, brand, danger, and info, step 10 of every scale except success and
warning, and step 8 of info (light). Light and dark backgrounds are unchanged.
