---
'@oztix/roadie-core': minor
---

New `@oztix/roadie-core/records` describes the lists organisers work
through. A `RecordField` names one fact about a record by key: its type,
whether it is filterable, sortable or searchable, a list or a date range,
how its dates compare (`event`, `access`, `timestamp` or `date`), the keys
holding its venue zone and local date, an identifier `match`, its currency,
its `options` and the dashboard `status` map. A `RecordView` saves a search,
filters, sort and layout as JSON.

`validateRecordView` checks a view against its fields and says which
operators fit. `resolveRecordQuery` fixes relative dates at a moment: event
and access dates compare the venue-local date, timestamps the viewer's day.
`matchesRecordQuery` filters rows in the browser, testing overlap for date
ranges. `parseQuery` reads typed text into ranked suggestions for
`QueryField`: identifiers, `field:value`, field names, option values and date
phrases. `toSearchParams` and `fromSearchParams` write and read a view as a
versioned URL (`v=1`), and `equalViews` tells whether a view was modified.
`recordFilterOperators` and `recordFieldOptions` list what a field accepts.

New `@oztix/roadie-core/records/meilisearch` exports `toMeilisearch`, which
turns a view into Meilisearch `q`, `filter` and `sort` with the same meaning.
