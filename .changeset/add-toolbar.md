---
'@oztix/roadie-components': minor
---

Add `Toolbar` (`@oztix/roadie-components/toolbar`), a row of buttons, toggles, links, and menus that takes one Tab stop.

It wraps Base UI's toolbar, and its parts render Roadie components at the toolbar's `size`: `Toolbar.Button` (a `Button`, an `IconButton` when its only child is an icon, or a routed link with `href`), `Toolbar.Toggle`, `Toolbar.ToggleGroup`, whose pressed fill slides between its toggles, `Toolbar.Group`, and `Toolbar.Separator`. The arrow keys move between items. On touch screens and phones the items scroll sideways on one row, and elsewhere they wrap. It sits in an `emphasis='normal'` surface by default; `subtle`, `raised`, and `floating` change it, and `subtler` drops it for a toolbar inside another surface.
