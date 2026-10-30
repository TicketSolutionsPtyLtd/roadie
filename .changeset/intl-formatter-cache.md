---
'@oztix/roadie-core': patch
---

Fix `currencyFormat` caching every currency code it's given, including bad codes read from row data, so its cache could grow without limit. Number, currency and relative-time formatters now share one bounded cache, keyed by constructor like the date formatters, and `formatRelative` no longer builds a formatter on every call.
