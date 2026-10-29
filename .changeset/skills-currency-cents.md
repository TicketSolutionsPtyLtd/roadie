---
'roadie-skills': patch
---

`/roadie:charts` reads full amounts in a chart as `$1,200.00` and names `decimals` and `trimZeros`, and `/roadie:build` passes `trimZeros: true` to `formatValue` for money outside a chart or table, now that `currency` shows cents on every amount.
