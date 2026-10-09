---
'@oztix/roadie-core': patch
---

`text-subtle` on the neutral intent now meets APCA Lc 75 for body text. The
neutral scale's step 11 (`--color-neutral-11`) is darker in light mode
(oklch L 0.503 to 0.45) and lighter in dark mode (0.769 to 0.87), so
secondary copy, placeholders and weekday labels read at Lc 75 or more on the
neutral surfaces. It stays lighter than `text-normal` (step 12).

Everything else on neutral step 11 moves with it: the neutral strong fill's
hover, `--intent-11`, chart labels and axis text, and the dark chart band.
