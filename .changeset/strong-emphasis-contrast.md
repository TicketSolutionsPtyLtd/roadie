---
'@oztix/roadie-core': minor
---

Text on a strong colour fill now reads at 4.5:1 or better. In light mode,
`emphasis-strong` on brand, accent, danger, success, warning and info put white
text on a mid-tone fill, at 2.1:1 to 3.5:1. `--intent-text-inverted` on those
intents is now the intent's darkest step in light mode, the same dark text they
already had in dark mode. The fills keep their brand colours. Hover and press
now lighten a colour fill through the new `--intent-bg-strong-hover` and
`--intent-bg-strong-active` tokens, so the text stays readable in every state.
Neutral is unchanged. `emphasis-inverted` and the overlays now take their text
from step 0, so they look the same as before.

This is a minor bump because `text-inverted` changes colour on the colour
intents in light mode. If you paired `text-inverted` with a fill other than
`bg-strong`, check it still reads.
