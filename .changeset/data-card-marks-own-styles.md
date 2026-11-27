---
'@oztix/roadie-components': patch
---

`DataCard`, `Meter`, and `Sparkline` style themselves with classes in their own components, and the stylesheet's `data-card` and `data-marks` rules are gone. Nothing looks different: the card still drops to compact padding and type below 240px, and the meter and sparkline marks still show in forced colours.
