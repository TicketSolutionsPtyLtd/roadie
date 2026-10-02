---
'@oztix/roadie-components': minor
---

Add `Kbd` (`@oztix/roadie-components/kbd`), a keyboard key or shortcut drawn
as a keycap. Known key names show a glyph or short word, `keys={['mod', 'k']}`
draws a combination, and `mod`, `shift`, `alt` and `ctrl` follow the reader's
platform without a hydration mismatch. It is `aria-hidden` unless `announce`
is set, and hidden on screens without hover.

`Menu` item `shortcut`s now render through `Kbd` and accept a key list such as
`['mod', 'd']`; text such as `'⌘D'` still renders as before. `Tooltip.Content`
and `Tooltip.Popup` take a new `shortcut` that shows keys after the label.
Menu shortcuts and the new tooltip shortcut are hidden on screens without
hover.
