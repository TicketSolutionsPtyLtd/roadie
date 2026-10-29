---
'@oztix/roadie-core': minor
---

Add `@oztix/roadie-core/number` with `currencyFormat`. It returns the `Intl.NumberFormatOptions` for money in the house style, so text and NumberFlow read amounts the same way: `$` for dollars and the code for any other currency, the currency's own decimal places, cents only when the amount isn't round, and an optional compact form. Chart values, record values, and filter sentences now all read money through it, with no change to what they show, except that an amount within half a cent (or half the currency's smallest unit) of a whole amount now reads `$1,200` instead of `$1,200.00`.
