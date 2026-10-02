---
'@oztix/roadie-core': patch
---

Date formatting reuses its `Intl.DateTimeFormat` instances, and `formatValue`
reuses its `Intl.NumberFormat` instances. Each formatted date used to build
three to five new formatters, which dominated the cost of tables and lists
that show a date on every row. The date cache holds at most 200 formatters
and drops the oldest first, so many locales or time zones cannot grow it
without limit.
