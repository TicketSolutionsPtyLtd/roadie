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
`entity` when given. Values read from the start of a word, and a value named
only in part is left out when a longer reading takes its words, so "melb this
weekend" never suggests a venue named Thistle, while "name disco melb" still
suggests "City is Melbourne". `toSearchParams` and `fromSearchParams` write and read a
view and position as a versioned URL (`RECORD_VIEW_FORMAT`, `v=1`), falling
back to a `fallback` view when the URL is invalid, and `equalViews` tells
whether a view was modified. `recordFilterOperators` and `recordFieldOptions`
list what a field accepts.

`recordFields<Row>()` builds an entity's fields with typed row keys
(`text`, `option`, `number`, `money`, `date`, `boolean`), and a number or
money field takes a `format`. `compileRecordQuery` turns a resolved query
into a predicate that reads the fields once, for filtering a long list;
`matchesRecordQuery` uses it. `sortRecords` sorts rows the way an index
would: text and labels as people read them, statuses by their `order`,
dates by instant, empty values last. `formatRecordValue` reads a value as
its field shows it: option and status labels, numbers and money in their
format and currency, Yes or No, and dates in the house formats.

New `@oztix/roadie-core/records/meilisearch` exports `toMeilisearch`, which
turns a view into Meilisearch `q`, `filter` and `sort` with the same filter
meaning. It needs Meilisearch 1.15 or later. The index stores instants as
epoch seconds (or milliseconds with `epoch: 'milliseconds'`), event and
access dates under their local date keys, and a range's end on every record;
`contains` needs Meilisearch's `containsFilter` feature.

`parseDatePhrase` no longer reads inherited object names such as
`constructor` as a date alias, unit or month.

`recordsToCsv(rows, fields, { timeZone })` writes records as CSV, each
value as its field reads in a table, with `values: 'raw'` for plain numbers
and formula-like text neutralised. `RecordSelection` types the records an
action takes.

`describeRecordFilter(filter, fields, { now, timeZone })` writes a filter as
its chip reads ("Venue is Kazoo Hollow Room", "Gross is more than $100",
"Starts: This weekend"), with the dates a relative range stands for in
`detail`. `recordOperatorLabel` names an operator ("is more than") and
`recordOptionPaths` gives each option's label with its parents' ("Ochre Kite
Weekender 2027 › Opening Night"). A chip listing more than two values names
them all in `detail`. `parseQuery` labels its filters the same way, dates included, names a
field whose label holds a colon in `field:value`, and reads `$` and
thousands commas in a number's value.

`parseQuery` reads negation as the opposite filter, and leaves none of its
words in `remainder`. "not melb" and "-melb" suggest "City is not Melbourne".
It also reads `isn't`, `excluding`, `except`, `without`, `!=`, and `≠` before
a value, `venue:!walrus`, "venue is not walrus", "city not syd", "city !=
syd", and "name doesn't contain disco". It reads "venue is walrus", "city =
syd", and "name contains disco" too. A negated value never also suggests its
positive, so "status is not sold out" offers only "Status is not Sold out". A
date or a comparison has no opposite, so a negated one reads nothing.

A number or money field's name, then `>`, `<`, `=`, `!=`, more than, less
than, over, under, between 20 and 50, or a range such as 20-50 in either
order, reads as that comparison: "capacity > 100" suggests "Capacity is more
than 100". `field:value` takes the same words, and "capacity:20 and 50" reads
as a range. `>=`, `<=`, `≥`, `≤`, at least, at most, and "100+" read nothing, but the
field's name still keeps "sold >= 100" from suggesting "Status is Sold out".
Numbers a space separates never join. A field name then a value with no verb reads as `field:value` does, so
"city melb" suggests "City is Melbourne" and "capacity 100" suggests "Capacity
is 100". Text a field contains stops before words other filters read to the
end, so "name disco melb" suggests "Name contains disco" and "City is
Melbourne" first. "city is empty" and "city is not empty" read as the field
having no value or one. A field name a statement reads is never also read as a
value, so "sold > 100" never suggests "Status is Sold out". A date keeps the
word that compares it: "starts after today" never suggests "Starts: Today",
and one it can't read, such as "after 7pm", suggests no date.
`parseDatePhrase` reads "after" and "before" with any day or range, such as
"after this weekend", and "since", "from", "until", and "till" with the day
itself included.

`toMeilisearch` takes a `position` and adds Meilisearch's one-based `page`
and `hitsPerPage`, so the response's `totalHits` counts the matches (up to
the index's `pagination.maxTotalHits`). A page below 0 or a page size below
1 throws a RangeError.

`placeRange(data, start, rows)` returns a copy of `data` with `rows` placed
from `start` and any gaps left undefined, for lists loaded by range.
