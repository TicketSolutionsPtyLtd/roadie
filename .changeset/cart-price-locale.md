---
'@oztix/roadie-widgets': minor
---

Fix the cart's animated subtotal and drawer total reading differently from its prices. They now format in the cart's `locale` and `currency`, so a German cart reads `1.200,00 €` and a yen cart `JPY 1,200`, as the line totals do. Add `priceFormat(currency)`, the options both use, and deprecate `currencyPrefix`: pass `locales` and `priceFormat(currency)` to NumberFlow instead.
