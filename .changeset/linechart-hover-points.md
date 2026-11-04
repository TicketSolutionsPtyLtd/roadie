---
'@oztix/roadie-charts': patch
---

`LineChart` follows the pointer without dropping frames on dense data. Each hover had re-read every row's date to colour the tooltip, so a year of daily data in four series dropped a sixth of its frames on a slowed CPU. It now reads them once per set of props and drops none.
