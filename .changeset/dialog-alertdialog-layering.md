---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
'@oztix/roadie-widgets': patch
---

Add a `z-alert` layering tier and let `Dialog` pick its z-index from the ARIA `role`.

- **core**: new `--z-index-alert` (80) tier above `tooltip`, for blocking alert dialogs that must stack over an open modal or drawer.
- **components**: `Dialog.Root` accepts `role='dialog' | 'alertdialog'` (default `dialog`). `alertdialog` sets `role="alertdialog"` on the surface and raises the backdrop + surface to `z-alert`.
- **widgets**: cart-drawer expiry modal uses `role='alertdialog'`; cart-drawer layering migrated to named z-index tiers and footer shadow tinted via `--intent-hue`.
