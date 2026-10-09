---
'@oztix/roadie-core': minor
---

`validatePalette` now checks every pair of categorical slots for normal vision,
not just neighbours, and fails any pair under ΔE 8 as `allPairsNormal`.
`paletteScores` gains an `allPairsNormal` field with the closest pair in each
mode: 17.2 in light and 8.5 in dark (slots 1 and 8). No colours change.
