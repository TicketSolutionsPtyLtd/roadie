---
'@oztix/roadie-core': minor
---

Dark mode chart colours now meet APCA Lc 45 against the page, the minimum for
non-text UI in decision 0010. `--chart-3` turns pale teal, `--chart-5` and
`--chart-2` lighten, `--chart-7` mutes to a dusty rose so it stays clear of
`--chart-status-critical`, and `--chart-1` and `--chart-6` shift slightly. The
dark `--chart-highlight` follows slot 1. `--chart-context` and `--chart-other`
mix toward neutral step 11 in dark mode, so they're easier to see.

`validatePalette()` measures the `darkMarkContrast` and `darkGreyContrast`
checks as APCA Lc, with a target of 45 instead of a 3:1 ratio, so their
`score` and `target` read in Lc. `chartHex('dark')` returns the new values,
and `paletteScores().dark.slotsUnderLc45` is now empty. Light mode is
unchanged.
