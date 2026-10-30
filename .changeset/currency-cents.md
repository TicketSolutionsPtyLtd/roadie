---
'@oztix/roadie-core': minor
---

Update `currency` to show cents on every amount, so `formatValue(1200, 'currency')` and `currencyFormat()` read `$1,200.00`, not `$1,200`, and figures line up in charts and tables. It reaches chart tooltips, value labels, and tables, `DataTable` and record table cells, CSV exports, and the `StatTile`, `DataCard`, and `Delta` values, and a money field in another currency reads `NZD 12,500.00`. For the old reading, pass `trailingZeroDisplay: 'stripIfInteger'` to `formatValue`, a chart, a card, a `Delta`, a table column, or a record field. Axis ticks, `compactCurrency` under $1,000, and filter descriptions such as "Gross is more than $2,000" still drop the cents from whole amounts.
