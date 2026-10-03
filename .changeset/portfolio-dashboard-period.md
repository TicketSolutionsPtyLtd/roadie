---
'@oztix/roadie-charts': minor
---

The portfolio example dashboard has a period, the past 30 days compared with
the previous period, so `DashboardView` shows a period toolbar above it. Spread
the new `portfolioDates` into `periodProps` so the toolbar's dates match the
data's. `createPortfolioDashboard(period)` works out the sales, gross and
refund tiles for any period from daily sales (`PortfolioPeriod`), and their
deltas follow the comparison (`comparison: true`). Gross revenue is now the
period's, not the shows' lifetime total. The first section is "At a glance",
and "Sold, last 30 days" is "Tickets sold".
