---
'@oztix/roadie-core': minor
'@oztix/roadie-components': patch
'@oztix/roadie-charts': patch
---

Roadie now has one focus ring: accent, 4px wide, with no gap, from the `--focus-ring-width`, `--focus-ring-opacity`, and `--focus-ring-opacity-dark` tokens. Plain links and buttons with no Roadie class, such as links in CMS content, now get it in place of the 2px ring with a 2px gap. `is-interactive`, `is-focusable`, and `is-interactive-within` draw it in accent instead of the nearest intent's colour, so a focused danger button shows the accent ring. An invalid field's ring stays danger.

Components that drew their own ring now use the same one: a focused chart plot, Toast, a linked DataTable row, and the bare NumberField stepper. ScrollArea's viewport and the `subtler` Tabs keep the ring inset by its width so their container doesn't clip it.
