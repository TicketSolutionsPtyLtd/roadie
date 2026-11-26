---
'@oztix/roadie-widgets': patch
---

Fix `CartDrawer` flashing to full height for a frame as it opens, in React. A drag that starts while the drawer is still settling now follows the pointer instead of toggling it, and the closed drawer rests at exactly `--cart-drawer-height`. In Vue, `initialState: 'open'` now opens the drawer when `open` is omitted, and two drawers on one page no longer overwrite each other's `--cart-drawer-height`.
