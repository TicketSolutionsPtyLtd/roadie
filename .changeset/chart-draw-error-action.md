---
'@oztix/roadie-charts': patch
---

`Chart` no longer shows `errorAction` when its plot can't be drawn. Loading the data again rarely fixes a drawing, so a Retry there only repeats the failure. The card still shows "This chart couldn't be drawn", and its `actions` stay. An `error` state the app sets still shows `errorAction`.
