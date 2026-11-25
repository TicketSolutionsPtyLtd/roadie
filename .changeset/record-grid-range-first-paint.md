---
'@oztix/roadie-components': patch
---

Fix `RecordGrid` in range mode (`loadRange`) growing several screens taller than its records on the server's paint and then collapsing on hydration. Until it measures its columns, it now draws the first ten cards and sizes the rest with CSS at whatever columns the width lays out, as a windowed `RecordGrid` already does, so the page stays put when it hydrates.
