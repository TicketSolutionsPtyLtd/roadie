---
'@oztix/roadie-components': minor
---

Add `RecordTable` (`@oztix/roadie-components/record-table`), a table of records to search, filter, sort, and page through, built on the records model in `@oztix/roadie-core/records`.

`@oztix/roadie-components/records` holds the parts it's built from. `useRecords` takes the records, their fields, a `RecordView`, and a `RecordPosition`, each controlled or not, and returns a `RecordsInstance`. `Records.Root`, or `Records.Provider` for parts spread across a `Pane`, shares it with `Records.Header`, `Records.Search`, `Records.Content`, `Records.Pagination`, `Records.Status`, `Records.Options`, `Records.Select`, `Records.Actions`, `Records.BulkActions`, and `Records.ViewActions`. `RecordValue` shows one value as its field reads. `tableColumns(fields).field(key, options)` and `tableLayout(columns)` describe the table.

- `Records.Search` is a `QueryField` named "Search and filter". It searches the searchable fields and turns typed text, such as "melb this weekend", into filter chips. Picking a field lists its values under a toggle of operators, with a calendar for dates. A field can carry an `icon` (`RecordsField`) for its suggestions.
- `scope` takes the filters a page sets, such as the event a list of tickets belongs to. They show as locked chips and are never part of the view.
- The table sorts from its headers, pins columns, and scrolls sideways with a Roadie scrollbar. Columns with a `priority` hide as it narrows, and under 40rem it lists its records as list rows or cards. Past 100 rows, only the rows near the screen render.
- `Records.Options` is the Configure button: the sort, the columns to show, hide, and reorder, and a Layout switcher when there's more than one layout.
- `bulkActions`, `rowActions`, `getRowHref`, and `actions` act on records. Each action gets the applied query and the `RecordsRequest` for its records. `downloadCsv` saves CSV from `recordsToCsv`.
- `baseline` is the saved view the screen opened, so `modified` and `resetView` work, and `Records.ViewActions` offers Save, Save as new, Rename, Reset, and Delete through your handlers. Your app stores the views.
- `rowCount` turns on server mode, where `onRequestChange` hands over the `RecordsRequest` to fetch, and `rowCountExact={false}` marks a count the server stopped at. `loadRange` loads one long list by range as people scroll.
