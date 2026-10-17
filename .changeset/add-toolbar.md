---
'@oztix/roadie-components': minor
---

Add `Toolbar` (`@oztix/roadie-components/toolbar`), a wrapper over Base UI's toolbar whose parts render `Button` (an `IconButton` when its only child is an icon), `Toggle`, a group of toggles that share one value, `Separator` and a routed `Button` link, all at the toolbar's size. It takes one Tab stop, moves with the arrow keys, scrolls its items sideways on one row on touch screens and phones and wraps them onto new lines elsewhere, and sets the size of the buttons and links it renders. It sits in an `emphasis='normal'` surface by default; `subtle`, `raised`, and `floating` change it, and `subtler` drops it for a toolbar inside another surface.
