---
'@oztix/roadie-components': minor
---

`Drawer` sizes on the top and bottom are now fixed heights, so a sheet holds
still while its content changes. Each is a share of the space the drawer can
use. That space leaves out the far edge's safe area and a gap, like an iOS
large sheet, and in a wider window the float off the near edge. `sm` is half
of it, `md` three quarters and `lg` all of it. The new `fit` size follows the
content up to all of it, and is the default for top and bottom drawers. Side
drawers keep `md` as their default, and `fit` there sizes to the content's
width up to the `lg` width. Remove any `h-*` class an app added to hold a
drawer's height.
