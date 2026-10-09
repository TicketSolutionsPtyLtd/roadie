---
'@oztix/roadie-core': minor
---

Shadows and the loading shimmer now tint by the nearest intent, as the Elevation and Skeleton docs describe. The `shadow-*` and `inset-shadow-*` utilities, the `--shadow-*` and `--inset-shadow-*` tokens, and `emphasis-raised`, `emphasis-floating`, `emphasis-sunken`, and `emphasis-field` take the hue of the closest `intent-*` class, on the surface or any ancestor, in light and dark mode. So do `animate-shimmer` and the `--sheen-shade` and `--sheen-highlight` tokens, which Skeleton uses. Before, they all kept the root intent everywhere. A raised card inside `intent-danger` now casts a faintly red shadow.

To keep a neutral shadow inside another intent, add `intent-neutral` to the surface or a wrapper. That also resets its fill and text to neutral. Browsers without `oklch()` keep the untinted fallback shadow, as before.

The dark mode and `oklch()` declarations of the shadow, rim light, and sheen tokens now sit in the `base` layer rather than outside any layer. A `--shadow-*` value you set on an element, with a utility or unlayered CSS, still wins there. One you set on an ancestor is reset at each element below it whose class contains `intent-`, as the other intent tokens are at each `intent-*` element.
