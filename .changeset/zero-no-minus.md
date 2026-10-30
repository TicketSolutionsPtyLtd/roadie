---
'@oztix/roadie-core': patch
---

Fix `formatValue` showing a minus on a value that rounds to zero: `-0.4` with no decimals now reads `0`, and a tiny negative amount `$0`, not `-0` and `-$0`, in every format.

`currencyFormat` options do the same, so NumberFlow and `Intl.NumberFormat` read `-0.001` as `$0.00`. Firefox before 116 and Safari before 15.4 keep the minus there.
