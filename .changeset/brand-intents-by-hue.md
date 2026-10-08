---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
---

Add brand intents named by hue. `intent-brand-purple` is a new brand intent on the purple scale that `info` also uses, with white labels on its strong fill. `intent-brand-blue` and `intent-brand-orange` are aliases of `intent-brand` and `intent-brand-secondary`, which stay. Every component `intent` prop accepts `brand-blue`, `brand-orange`, and `brand-purple`, and `cn()` treats them as one intent group.

Add a fixed `--color-{scale}-light-9` token for every scale. Like the light 0, 5, 12, and 13 steps, `.dark` doesn't override it, so brand artwork keeps its step 9 colour in dark mode.

`text-display-prose-2` is now weight 700 (Bold), down from 800.
