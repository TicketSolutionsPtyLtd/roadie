---
'@oztix/roadie-core': minor
---

Add `decimals` and `trimZeros` options to `formatValue`, `formatDelta`, and `describeDelta`, as `formatValue(0.0127, 'percent', { decimals: 2 })` for `1.27%`. `decimals` fixes the places for `number`, `percent`, `points`, and `currency`, from none to four. `trimZeros` drops the decimals from a whole value, so `$1,200` instead of `$1,200.00`. Compact formats and `index` ignore both. Number and money record fields, dashboard card values and deltas, plot specs (including a bar chart's `line`), and table columns take them too, and `ValueFormatOptions` types them. `points` now says "pt" only when the value reads as 1: 1 at two places reads `1.00 pts`, and 0.96 reads `1 pt`.
