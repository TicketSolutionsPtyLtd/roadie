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

Saved views: `useRecords` takes a `baseline`, the saved or preset view the
screen opened, and gives `modified` (the view differs from it by
`equalViews`) and `resetView`, which goes back to it from the first page.
`Records.ViewActions` (or `viewActions` on `Records.Toolbar` and
`RecordTable`) shows the view's name after the search, with a dot once
it's modified, and a menu of Save view, Reset view, Save as new view, Rename
view and Delete view. The app keeps the views: each action calls its
handler (`onSave`, `onSaveAs`, `onRename`, `onDelete`) with a `RecordView`,
and each action but Reset shows only when its handler is given, so a
preset takes `onSaveAs` alone. Names are asked for in a dialog, or a bottom drawer on a
phone, and delete asks first. A handler can return a promise; a dialog
stays open with the rejection's message until it succeeds.
