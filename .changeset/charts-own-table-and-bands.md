---
'@oztix/roadie-charts': patch
---

A chart's table view passes `fill` to its `DataTable` instead of the charts stylesheet reaching into the table's parts, and a static plot picks its narrow, default or wide image with classes on each band. Nothing looks different.
