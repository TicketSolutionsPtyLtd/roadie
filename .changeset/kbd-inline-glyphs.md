---
'@oztix/roadie-components': patch
---

`Kbd` draws its key glyphs from inline SVG rather than `@phosphor-icons/react`, so a Tooltip, Menu, or anything else with a shortcut no longer loads all six weights of ten icons. The glyphs render exactly as before.
