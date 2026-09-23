---
'@oztix/roadie-components': minor
---

`Drawer` sizes on the top and bottom are now fixed heights, so a sheet holds
still while its content changes: `sm` is half the screen, `md` three quarters,
and `lg` the whole screen less the top safe area and a gap, like an iOS large
sheet. The new `fit` size follows the content up to the `lg` height, and is
the default for top and bottom drawers. Side drawers keep `md` as their
default, and `fit` there sizes to the content's width up to the `lg` width.
Remove any `h-*` class an app added to hold a drawer's height.
