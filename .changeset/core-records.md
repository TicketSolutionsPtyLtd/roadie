---
'@oztix/roadie-core': minor
---

New `@oztix/roadie-core/records` describes the lists organisers work
through. A `RecordField` names one fact about a record by key: its type,
whether it is filterable, sortable or searchable, a list or a date range,
how its dates compare (`event`, `access`, `timestamp` or `date`), the keys
holding its venue zone and venue-local dates (`localDateKey`,
`endLocalDateKey`), an identifier `match`, its currency, its `options` and
the dashboard `status` map. A `RecordView` saves a search, filters, sort and
layout as JSON; page, page size and scroll row travel beside it as a
`RecordPosition`.

`validateRecordView` checks a view against its fields and says which
operators fit. `resolveRecordQuery` fixes relative dates at a moment: event
and access dates compare the venue-local date, timestamps the viewer's day.
`matchesRecordQuery` filters rows in the browser, testing overlap for date
ranges. Text compares without case, and negative filters (is not, does not
contain, not equal) keep records where the field is empty. `parseQuery`
reads typed text into ranked suggestions for `QueryField`: identifiers,
`field:value`, field names, option values and date phrases, tagged with an
`entity` when given. `toSearchParams` and `fromSearchParams` write and read a
view and position as a versioned URL (`RECORD_VIEW_FORMAT`, `v=1`), falling
back to a `fallback` view when the URL is invalid, and `equalViews` tells
whether a view was modified. `recordFilterOperators` and `recordFieldOptions`
list what a field accepts.

New `@oztix/roadie-core/records/meilisearch` exports `toMeilisearch`, which
turns a view into Meilisearch `q`, `filter` and `sort` with the same filter
meaning. The index stores instants as epoch seconds (or milliseconds with
`epoch: 'milliseconds'`), event and access dates under their local date keys,
and a range's end on every record; `contains` needs Meilisearch's
`containsFilter` feature.
