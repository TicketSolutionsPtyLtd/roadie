---
'@oztix/roadie-charts': patch
---

The portfolio example dashboard has a period: the past 30 days compared with
the previous period. `createPortfolioDashboard(period)` works out its sales,
gross and refund tiles for any period from daily sales, and their deltas follow
the comparison (`comparison: true`). `portfolioDates` holds the dates its data
covers, ready for `periodProps`. The first section is now "At a glance", and
"Sold, last 30 days" is now "Tickets sold".
