---
'@oztix/roadie-core': minor
---

`paletteScores()` from `@oztix/roadie-core/dataviz` measures low-contrast
slots with APCA. The new `slotsUnderLc45` field lists the categorical slots
under Lc 45, APCA's minimum for non-text UI, against each mode's page
surface. The old `lightSlotsUnder3` field is deprecated and now returns the
same slots: light mode goes from 2, 4, 6, and 8 to 4 and 8, and dark mode
from none to 3, 5, and 7. `validatePalette()` is unchanged.
