---
'@oztix/roadie-core': minor
---

Shadows now tint by the nearest intent, as the Elevation docs describe. The `shadow-*` and `inset-shadow-*` utilities, the `--shadow-*` and `--inset-shadow-*` tokens, and `emphasis-raised`, `emphasis-floating`, `emphasis-sunken`, and `emphasis-field` take the hue of the closest `intent-*` class, on the surface or any ancestor, in light and dark mode. Before, they kept the root hue everywhere. A raised card inside `intent-danger` now casts a faintly red shadow.

To keep a neutral shadow inside another intent, add `intent-neutral` to the surface or a wrapper. That also resets its fill and text to neutral. Browsers without `oklch()` keep the untinted fallback, as before.
