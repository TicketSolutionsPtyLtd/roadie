---
'@oztix/roadie-components': minor
---

New `@oztix/roadie-components/records` shows a list of records. `useRecords`
takes the records, their `RecordField`s and a `RecordView` (controlled or
not) with its page and page size, and searches, filters, sorts and pages
them in the browser. Filters a view names but the fields can't apply are
skipped, with a warning in development. `Records.Root` (or
`Records.Provider`, which adds no element, for parts spread across a
`Pane`) shares it with `Records.Toolbar` and its plain-text
`Records.Search`, `Records.Content`, `Records.Pagination` and a
`Records.Status` live region. Content shows the view's layout, or the first
one given, with skeleton rows while loading, an error with Retry, and an
empty state that says whether nothing exists yet or nothing matches.
`RecordValue` shows one value as its field reads.

New `@oztix/roadie-components/record-table` adds the table layout:
`tableColumns(fields).field(key, { pin, width, cell })` presents a field as
a column, `tableLayout(columns)` gives it to `Records.Root`, and the view's
`layout.columns` orders and hides them. The table sorts from its headers,
pins columns, and scrolls sideways with a Roadie scrollbar that sticks to
the bottom of whatever scrolls the page, or both ways in its own box with
`maxHeight` or `fill`. `RecordTable` puts the toolbar, table, pagination
and status together.
