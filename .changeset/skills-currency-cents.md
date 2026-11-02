---
'roadie-skills': patch
---

`/roadie:charts` reads full amounts in a chart as `$1,200.00` and names `decimals` and `trailingZeroDisplay`, and `/roadie:build` keeps cents in a cart, checkout, receipt, chart, or table and passes `trailingZeroDisplay: 'stripIfInteger'` to `formatValue` for money in copy, now that `currency` shows cents on every amount.
