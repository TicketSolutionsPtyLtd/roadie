---
'@oztix/roadie-components': minor
---

Logo takes three new props, from the brand logo pack. `tagline` adds Built
on Partnerships after a divider. `layout='stacked'` sets the wordmark, and the
tagline when it's on, under the mark. `tone` picks the mark and wordmark
colour, the same in light and dark mode: `brand` (the default, unchanged),
`dark`, or `light`. The brand tagline and divider follow the theme, like the
brand pack's on-light and on-dark artwork; the dark and light ones are fixed. A `mark`, `wordmark`, or `product` logo takes no tagline, and a
product logo stays horizontal. A logo with the tagline is named "Oztix, Built
on Partnerships". The `LogoLayout` and `LogoTone` types are exported.
