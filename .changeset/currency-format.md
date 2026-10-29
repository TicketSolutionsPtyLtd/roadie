---
'@oztix/roadie-core': minor
---

Add `@oztix/roadie-core/number` with `currencyFormat`. It returns the `Intl.NumberFormatOptions` for money in the house style, for text and for NumberFlow's `format`: `$` for dollars and, in `en-AU`, the code for any other currency, the currency's own decimal places, `trimZeros` to drop the cents from a round amount, and an optional compact form, which Intl reads as `$1.2M` where `formatValue` reads `$1.2m`. Chart values, record values, and filter sentences now all read money through it, with no change to what they show, except that where they drop the cents from a round amount, one within half a cent (or half the currency's smallest unit) of it now reads `$1,200` instead of `$1,200.00`.
