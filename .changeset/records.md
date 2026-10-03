---
'@oztix/roadie-components': minor
---

New `@oztix/roadie-components/records` shows a list of records. `useRecords`
takes the records, their `RecordField`s, a `RecordView` and a separate
`RecordPosition` for the page and page size (each controlled or not), and
searches, filters, sorts and pages them in the browser. Filters a view names
but the fields can't apply are skipped, listed in `skippedFilters` and
warned about in development. `Records.Root` (or
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

Records can be selected: `useRecords` takes `selectable` and a
`RecordSelection` (`selection`, `defaultSelection`, `onSelectionChange`),
picked ids or every match but some, and drops what a new search or filter
hides. `matchingRows` lists every match in sort order across pages.
`rowActions` puts a menu on each record and `getRowHref` links it through
the table's title column; with selection on, a click elsewhere on a row
selects it and Shift extends the range. `Records.BulkActions` acts on the
selection: in the table's header row while records are selected, with a
count menu to select all or clear and a More actions menu for actions that
don't fit, or floating at the foot of the screen for a layout without a
header row. `Records.Actions` (or the toolbar's `actions`) acts on every
match. Danger actions and any with `confirm` ask first. `Records.Select`
gives a layout without checkboxes a Select mode. `downloadCsv` saves CSV
text as a file. `RecordTable` takes `bulkActions` and `tableActions`.
`Records.Search` takes an `aria-label`, and `Records.Status` announces the
selection and a search's count once typing settles.
