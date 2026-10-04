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
`Pane`) shares it with `Records.Toolbar` and its `Records.Search`,
`Records.Content`, `Records.Pagination` and a
`Records.Status` live region. Content shows the view's layout, or the first
one given, with skeleton rows while loading, an error with Retry, and an
empty state that says whether nothing exists yet or nothing matches.
`RecordValue` shows one value as its field reads.

New `@oztix/roadie-components/record-table` adds the table layout:
`tableColumns(fields).field(key, options)` presents a field as a column,
taking `pin`, `width`, `cell`, `kind`, `alt`, `narrow` and `priority`;
`tableLayout(columns, { narrow })` gives it to `Records.Root`, and the
view's `layout.columns` orders and hides them. The table sorts from its headers,
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
actions that don't fit, otherwise floating at the foot of the screen, where
the first action shows and those that don't fit go in a More actions menu,
last.
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

`Records.Search` searches and filters in one `QueryField`, named "Search and
filter". Typing searches the searchable fields as before and suggests filters
from the fields: option values (or, in the browser, the values an option
field without `options` holds), statuses, booleans by name, identifiers and
date phrases such as "this weekend", each becoming a chip; the words a
suggestion doesn't read stay in the field. Picking a field lists its values,
or for a date its quick dates and Custom dates; a number or text field opens
its editor. Option values added to a field join its chip. Each chip opens an
editor for its condition and value as they change (a list of values, a date
range picker with relative presets, a date picker, a number, text, or Yes and
No), in a popover under the chip or a bottom drawer on a phone, with Remove
filter; a filter whose values are cleared is removed as its editor closes,
and the editor loads while the page is idle. A relative date chip shows its dates
in a tooltip, and a filter the fields can't apply shows in warning colours.
`/` focuses the search unless `shortcut` (or `searchShortcut` on
`Records.Toolbar` and `RecordTable`) says otherwise, and Clear and Escape
clear it. The toolbar keeps its buttons at the top as chips wrap.

`useRecords` takes a `scope`: filters the page sets, such as the event a list
of tickets belongs to. They filter with the view but are never part of it,
so they are never saved, put in the URL, cleared or counted as filtering, and
`Records.Search` shows them first as locked chips. `scopedQuery` is the
applied query with the scope's filters first: fetch it in server mode, and
table and bulk actions get it, so acting on every match stays within the
page. The instance gains `scope`
and `now`, and writes made in one event, such as a search and a filter
together, build on each other. With no match, the empty state names the
search and filters that matched nothing.

Give `useRecords` a `rowCount` and it runs in server mode (`mode: 'server'`):
`data` is the page the server returned, shown in its order, and `rowCount`
counts every match for pagination and selection. The search waits for a
250ms pause in typing before `onViewChange` hears it (clearing is
immediate), and `searchText` holds what the field shows meanwhile. Records
picked on different pages stay selected, Select all counts `rowCount` less
its `except` ids, and bulk actions get the selection as picked, since the
server decides what matches. A new search or filter clears the selection,
and an action that settles after one leaves the new selection alone. Once
given, `rowCount` keeps server mode on, and an `undefined` count keeps the
last one. Selecting without `getRowId` in server mode warns in development,
as index ids repeat on every page. `appliedView` now leaves out the filters
and sorts the fields can't apply, and its `query` keeps its identity while
its content holds; key a fetch on `scopedQuery`, the position and
`timeZone`. Selection treats a chip's values in any order as the same
filter, and ignores filters the fields can't apply. `Records.Status`
holds a count while `loading` and announces it once loaded, and
`Records.Pagination` reads a page past the end as the last page.

Give `useRecords` a `loadRange` and it runs in range mode (`mode: 'range'`):
one long list, searched, filtered and sorted on the server, that loads the
records on screen plus a screen either side as people scroll. Each range is
one page of `pageSize` records, `{ start, end }` with `end` exclusive, and
`data` holds the records loaded so far at their index (`placeRange` puts a
range there). With `rowCount` the list is that long from the start; without
it, ranges load one after another until one comes back short. Rows not yet
loaded show as placeholders. A failed range shows an error row with Retry in
its place, keeping the records already loaded, or the error state when none
have. The list reports the first row on screen as `position.row` (through
`setRow` and `onPositionChange`) and scrolls back to a row set from outside,
such as from the URL, loading its range first; a row it reported itself
never scrolls it back. `records.range` (`RecordsRangeState`) holds the
loading state for a layout, and `RecordsRange` types a range. A count of 0
counts only once a range of the query confirms it, so a list whose count
starts at 0 still asks for its first range. `Records.Pagination` shows the
count instead of pages, and `Records.Status` announces a count only once the
total is known. Bulk actions get the selection as picked, as in server mode,
`loading` neither dims rows nor shows skeleton rows (placeholders show what
loads), `records.error` is set when a range fails before any record loads,
and `onRetry` is always given. The header checkbox is named "Select loaded
rows", and range mode stops at 300,000 rows. In every mode `data` may hold
undefined gaps, which are left out, and `records.data` is the records held
without them.

The table renders only the rows near the screen past 100 rows, so find in
page and printing see only those, and focus in a row that scrolls away
moves to the table. When it holds only some of its rows (a page of several,
a long page, or a list loaded by range) it carries `aria-rowcount` and each
row its `aria-rowindex`. In server and range mode, column widths come from
the first records a search or filter brings and hold as people page or
scroll.

Under 40rem of its own width the table lists its records, as list rows or,
once any column is a `detail`, as cards. Each column takes a `narrow` place:
`title`, `description`, `leading`, `trailing`, `detail` or `hidden` (the
default). The title carries the record's link, the bulk actions float, and
a selectable table offers Select mode: `Records.Select` (in the standard
toolbar) shows Select, Select all and Done, each record shows a checkbox a
tap anywhere on it toggles, and Escape or Done leaves. A selection made wide
enters Select mode as the table narrows, and focus follows the record across
the switch. Narrow rows page, window past 100 records and load by range as
the wide rows do, with placeholders and range errors at their size.
`tableLayout`'s `narrow` (or `RecordTable`'s) picks `'list'` or `'cards'`.
A column with `priority` 3, 2 or 1 hides as the table narrows below 64, 56
and 48rem, header and rows together; pinned columns never hide. A column
with `kind: 'image'` shows its value, an image URL, as a 40px thumbnail with
`alt` from the row, a list row's leading image and a card's 16:9 banner, and
a neutral tile without one. The title column is the one with
`narrow: 'title'` before the pinned text column, and never an image. Focus
lands back with the records when the floating bar goes, under
`Records.Provider` too.
