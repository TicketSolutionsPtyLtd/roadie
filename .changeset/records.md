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
picked ids or every match but some. A search or filter change drops picked
records it hides and drops a select all; sort and page changes keep it.
`matchingRows` lists every match in sort order across pages. `rowActions`
puts a menu on each record and `getRowHref` links it through the table's
title column; with selection on, a click elsewhere on a row selects it and
Shift extends the range, and Cmd, Ctrl or middle click opens the record in
a new tab. `Records.BulkActions` acts on the selection: in the header row
of a layout whose definition says `bulkActions: 'header'`, as the table's
does, with a count menu to select all or clear and a More actions menu for
actions that don't fit, otherwise floating at the foot of the screen.
`Records.Actions` (or the toolbar's `actions`) acts on every match. Danger
actions ask first unless `confirm` is `false`, and any action given
`confirm` asks. `downloadCsv` saves CSV text as a file. `RecordTable` takes
`bulkActions`, `tableActions` and `searchLabel`, and `record-table` exports
`shownColumns` for the columns a view shows. `Records.Search` takes an
`aria-label`, `Records.Toolbar` a `searchLabel`, and `Records.Status`
announces the selection and a search's count once typing settles.

`Records.Options` is a Configure button for the view, in the standard
toolbar after the search and before the table actions. It opens a popover,
or a bottom drawer on a phone, with the sort (a field and direction per
level, in the field's own terms such as Low to high, with Add sort and
Remove) and the shown layout's settings. For the table these are its
columns: drag a handle, or use its Move menu, to reorder them, and an eye
toggle to show or hide each one. They write `view.query.sort` and
`view.layout.columns`, leaving out an order or hidden list that matches the
columns as defined and keeping keys for columns the table doesn't have.
`label` renames the button, which is "Configure table" for the table. A
layout definition adds its own settings with `Settings`, which can carry a
`preload` that runs once the page is idle or the button is reached; the
table's columns list loads that way, out of the table's first load.
