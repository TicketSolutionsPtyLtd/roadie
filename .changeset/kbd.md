---
'@oztix/roadie-components': minor
---

Add `Kbd` (`@oztix/roadie-components/kbd`), a keyboard key or shortcut drawn
as a keycap. Known key names show a glyph or short word, `keys={['mod', 'k']}`
draws a combination with a keycap per key, `joined` draws it on one keycap
(⌘K, or Ctrl+K off Apple), and `mod`, `meta`, `shift`, `alt` and `ctrl` follow
the reader's platform without a hydration mismatch. `emphasis` is `subtle` (a
tinted keycap, the default), `normal` (a bordered keycap) or `subtler` (plain
text in the surrounding colour), built on Roadie's `emphasis-*` utilities.
When the nearest surface is an `emphasis-strong`, `emphasis-inverted` or
`emphasis-overlay` fill, a subtle keycap takes that surface's
`--surface-tint-*` colours, so it stays readable. A strong `Tabs` tab and a
pressed `ToggleGroup` item set them too, because their fill is a sliding
indicator. Kbd is `aria-hidden` unless `announce` is set, and is hidden on
screens without hover unless announced.

`Menu` item `shortcut`s now render through `Kbd` and accept a key list such as
`['mod', 'd']`. Text such as `'⌘D'` keeps its characters, but a known key name
given as text now shows its `Kbd` face (`'Enter'` gains the return glyph,
`'Delete'` reads "Del", `'Shift'` becomes ⇧ on Apple devices) and a single
letter shows in capitals. Menu shortcuts are now hidden on screens without
hover. `Tooltip.Content` and `Tooltip.Popup` take a new `shortcut` that shows
keys after the label.
