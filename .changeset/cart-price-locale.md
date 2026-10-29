---
'@oztix/roadie-widgets': patch
---

Fix the cart's animated subtotal and drawer total reading differently from its prices. Every cart price now reads through `currencyFormat` from `@oztix/roadie-core/number`, in the cart's `locale` and `currency`: a German euro cart reads `1.200,00 €`, an `en-AU` yen cart `JPY 1,200`, and an `en-US` Australian dollar cart `$1,200.00`, where it read `A$1,200.00` before. Deprecate `currencyPrefix`: pass `locales` and `currencyFormat({ currency })` to NumberFlow instead.
