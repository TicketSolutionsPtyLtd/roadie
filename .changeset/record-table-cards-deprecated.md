---
'@oztix/roadie-components': minor
---

Deprecate `RecordTable`'s cards: the `narrow: 'detail'` column role, the `narrow` prop on `RecordTable` and `tableLayout`, and the `RecordTableNarrowLayout` type. They go at the next major, when a narrow table keeps its rows as a table. For records as cards, use `RecordGrid`. Tables that use them work as they do now.
