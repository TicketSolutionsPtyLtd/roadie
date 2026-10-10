---
'@oztix/roadie-core': minor
'@oztix/roadie-components': patch
'@oztix/roadie-charts': patch
---

Every focus ring now has the same shape: 4px wide with no gap, from the `--focus-ring-width`, `--focus-ring-opacity`, and `--focus-ring-opacity-dark` tokens. Plain links and buttons with no Roadie class, such as links in CMS content, now get a 4px ring with no gap, where they had a 2px ring with a 2px gap. The ring's colour is unchanged: it still follows the nearest intent, and fields still use accent, or danger when invalid.

Components that drew their own ring now use the base ring, so they follow the nearest intent too: a focused chart plot, Toast, and ScrollArea's viewport. The bare NumberField stepper's ring loses its 2px gap. ScrollArea's viewport and the `subtler` Tabs keep the ring inset by its width so their container doesn't clip it.
