---
'@oztix/roadie-components': patch
---

Select, Combobox, and Autocomplete popups now float like Menu: `emphasis-floating` replaces the 1px border and `shadow-lg` with the rim light and `shadow-xl`, and they open and close with `motion-scale`, on Roadie's duration and easing tokens. Unlike Menu they stay opaque, since a backdrop blur repaints under every keystroke. Their option rows, group labels, check indicators, and empty messages share one set of classes, so they can't drift apart. Props and slots are unchanged, and a `className` on any part still overrides.
