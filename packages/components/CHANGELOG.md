# @oztix/roadie-components

## 2.18.0

### Minor Changes

- 5807ab1: Update `DataCard`'s empty and error states to use `EmptyState`, like the rest of Roadie: an icon tile above the message at every size but `stat`, the error in danger with `errorAction` under its message. The state takes the body's place, at least `bodyHeight` tall, so a card keeps its loading height and an empty stat tile doesn't stretch its row. A chart that can't be drawn now says "This chart couldn't be drawn" in its card, the same message and look it shows before hydration, so a server-rendered dashboard no longer flashes from one error to another. An app's own `state` of loading, empty or error still wins over an earlier draw failure.
- fd2363d: Add the exports the root entry was missing, so what a component subpath exports also imports from `@oztix/roadie-components`. That's `useFieldControlError` and the types `CalendarDirection`, `CalendarLayout`, `CalendarView`, `DashboardPeriodCompareOption`, `DataTableExpanded`, `DataTableTotals`, `QueryFieldOperator`, `QueryFieldPendingChip`, `RecordTableNarrow`, `RecordTableNarrowLayout`, `TableLayoutOptions`, `RecordsActionContext`, `RecordsField`, `RecordsGivenTotals`, `RecordsOptionsProps`, `RecordsRange`, `RecordsRangeResult`, `RecordsResolvedTotals`, `RecordsSelectProps`, `RecordsSetSelecting`, `RecordsTotals`, `RecordsViewActionsProps`, `RecordsViewHandler`, and `SparklineGeometry`. The package also stops shipping its test helpers in `dist`.
- 1ddb0e9: Add `decimals` and `trailingZeroDisplay` to `Delta`, `DataCard`, and `StatTile`, and to `DataTable` number, meter, sparkline, and delta columns, which format their values the way `formatValue` does with those options. A card's delta without its own `format` takes the card's format and places.
- 64ae958: Add the `DataTableRecordName` type to `@oztix/roadie-components/data-table`, so typing `recordName` no longer needs a core import.
- 3a5c438: Add `stacked` to `DateTime`, which puts the time on a line under the date for a dense table column. It's still one `time` element, and its `dateTime` carries the full instant, so a screen reader hears `27 Nov 2026, 7:30pm`. It needs a `timeStyle`. Without one, or with `relative`, it renders on one line as before. A range on one day, or one night with `sameNight`, says the date once over the two times. A range across days stays on one line.
- 6817343: Add `label` to `List.Item`, naming a reorderable row in its Reorder handle and announcements when its `title` isn't plain text. Such a row with no `label` used to get an unnamed handle; it now warns in development.
- 19c9a3e: Add `setSelecting` to what `useRecords` returns, so your own control, such as a Select item in a phone's More menu, can start Select mode. Its type is `RecordsSetSelecting`. `setSelecting(false)` leaves and clears the selection, as Done does, and records that aren't `selectable` never enter it.

  On a wide table, which has a checkbox per record, Select mode now waits until the table narrows. Until then, the status doesn't announce it and Escape doesn't clear the selection.

### Patch Changes

- 5aecb81: Export the `DataTableRecordName` type from the package root, as `@oztix/roadie-components/data-table` already does.
- 004c0c4: Fix `Calendar` reading a repeated announcement only once, such as "2 dates selected" after a parent changes several dates twice in a row. Its live region skips text that hasn't changed, so a repeat now changes it.
- b0f142f: Update `DataCard` labels to wrap to two lines, then truncate, so a chart card's title such as "Tickets sold by ticket type" fits beside the Chart/Table switch and More. Actions sit on the label's first line, so they line up across a row of cards. A `stat` label still truncates on one line, so the values in a row of stat tiles line up. `COPY_LIMITS` labels grow to 60 characters at `sm` and `md` and 72 at `lg` and `full`, `CHART_LABEL_LIMITS` to 42 and 50, and `ACTIONS_LABEL_LIMITS` to 29 and 42, so `validateDashboard` warns about a card label only past two lines. Stat labels and context lines keep their one-line limits.
- 8c02b3c: Fix `Combobox.Trigger` and `Combobox.Clear` centring on the whole input group once chips wrap onto several rows. Inside `Combobox.InputGroup` they now stay centred on the first row, as `QueryField`'s icon and Clear do.
- 8c02b3c: Fix `Combobox.ChipRemove` looking clickable in a `readOnly` combobox, where it can't remove anything. It now renders nothing there.
- 3832a39: Fix `DashboardPeriod` shrinking to nothing in a flex row beside other controls, an `inline-flex` parent, or an `auto` grid track. In a flex row it keeps at least 20rem, or the row's width when that's less; in an `inline-flex` parent or an `auto` track it takes 20rem, and an `auto` track narrows it when the grid has less room. The `DateRangePicker` button also gives its calendar icon more room at each size: 8px from the edge and before the dates at `sm`, 12px and 10px at `md`, and 14px and 12px at `lg`.
- 5172b10: Fix `DashboardPeriod` offering Previous period and Previous year for a range with no end, such as Upcoming, which then showed "Nothing to compare" on every card. Those choices and Custom dates now turn off for such a range, Compare turns on with the first choice that has dates, and the period reads none of them for such a range, even one given from outside, and Apply drops it. In the picker, Compare shows off, with "Nothing to compare" under its label when no choice has dates, and the comparison comes back if the range gets an end again. An app's own comparison still reads.
- 97c9577: Add Upcoming to `DashboardPeriod`'s default presets, after Next 90 days. Choosing it turns Compare off, since a range with no end has nothing to compare.
- d8f4350: Fix a controlled `DataTable` that couldn't go back to its rows' own order: `sort={undefined}` handed control back to the table, so the last sort stayed. Pass `sort={null}` for a controlled table with no sort; `sortDataTableRows` takes `null` too, so a server table can hand both the same value. Sorting by a status column's `order` also reads its status map once per sort, not once per row.
- e37fc60: Fix a server-rendered `Image` with `placeholder='blur'` staying hidden until React hydrates, which held an already-downloaded hero at its blurred preview for seconds on a slow phone. An image whose `src` is in the server HTML now shows as soon as the browser has it, over the blurred preview, without the fade. An image that mounts on the client, or a `defer`red one whose `src` arrives after hydration, still fades in.
- 2e680e2: Reword prop descriptions and code comments without em dashes, so the props tables and editor hints follow the house punctuation. No behaviour changes.
- 8a116ed: Fix `Kbd` quietly ignoring `combined` without `keys`. It now warns in development, since `combined` only joins `keys` into one keycap. The `separator` docs now say only a string with a word is read aloud; an element separator stays hidden.
- a1e3436: `Records.BulkActions` keeps a lone action's label on narrow records, beside its icon. The floating bar now collapses actions to their icons only when there are several, since one action has room for its word and a lone icon is hard to read.
- c9a92a1: Navigator no longer logs React's "Each child in a list should have a unique
  key" warning when part of a `Navigator.Item` label or a `Navigator.MenuItem`
  streams in. The item's label and its menu's items were copied with
  `Children.toArray` and `Children.map`, and those re-keyed copies flagged a
  child that had skipped JSX's key check, such as a promise React unwraps. They
  now render as given, and a streamed menu item still runs its `onSelect`.
- 8c02b3c: Fix `QueryField` reading "No suggestions" while it asks again for text whose last request failed, such as on reopening. It now reads "Loading suggestions" until the retry settles.
- 816b18e: Fix range-mode cards in `RecordTable` and `RecordGrid` jumping while you scroll up. When records replaced their loading placeholders above the screen, the cards on screen moved by the difference in height. This started with `@tanstack/react-virtual` 3.14.22.
- a30fd81: Fix `RecordTable` sizing a column with a custom `cell` for "Not available" when its values are empty; the custom cell shows its own empty state.
- 6333798: Fix `RecordTable` sometimes dropping focus to the page when a narrower width hides the column holding it, on a busy device where the browser blurs the hidden control before the table sees the column go. Focus moves to the table, as it does otherwise.
- 1e2822f: Update `RecordTable` row titles to wrap onto two lines before they're cut short, linked or not, instead of at one. A title linked with `getRowHref` keeps its strong text and underlines in the accent on hover, as a `DataTable` title does. A focused title rings its whole cell. A custom title `cell` now lays itself out the same way linked or not, so give it `truncate` to keep it on one line. Rows stay 48px tall, and narrow list rows are unchanged.
- a78560e: Fix `roadie.manifest.json` linking `Records` to the records foundation page, which only shares its name, instead of the RecordTable page that documents its props. Agents reading the manifest now land on its API reference. `Records` no longer takes the foundation page's description as its `summary`, since that page isn't its own.
- 98952de: `Records.Select` shows Select all and Done at the default emphasis, like the other controls in the header. Done was a strong button, so it competed with the page's main action, and Select all was subtler than the rest of the row. Select and Done also fade on hover and shrink on press, like other buttons, where before they changed state at once.
- 643f167: Fix a `RecordTable` row checkbox ignoring a click on the padding around its box, or a press that slipped off the box as the page moved. The toggle now runs from the checkbox's change, so the whole label selects the row, with Shift still extending a range.
- 4fdb8b6: Fix Node failing to import `@oztix/roadie-components` and `@oztix/roadie-components/sortable` with `ERR_UNSUPPORTED_DIR_IMPORT`, which broke Vitest in apps that don't inline Roadie. Sortable now bundles Pragmatic drag and drop, whose folder subpaths Node's ESM loader rejects, so the `@atlaskit/pragmatic-drag-and-drop` packages are no longer dependencies. The build now fails if Node can't import any subpath.
- 4121e15: Fix toggling a `Sortable.Item`'s `disabled` rebuilding its drop target too, which cleared a drop line it was showing. Dragging and taking drops now register separately, so only the drag comes and goes with `disabled`. An item with no `Sortable.Handle` now takes drops too, where it used to ignore them.
- 63698aa: Stop shipping the touch, pointer, and contrast test helpers, and the Vitest copy they bundled, in the published package. Nothing imported them, so nothing changes at runtime.
- Updated dependencies [700daba]
- Updated dependencies [8682b82]
- Updated dependencies [b0f142f]
- Updated dependencies [1b02fc5]
- Updated dependencies [18b7674]
- Updated dependencies [ef4073a]
- Updated dependencies [7258634]
- Updated dependencies [1ddb0e9]
- Updated dependencies [b596cb6]
- Updated dependencies [ba2a0a5]
- Updated dependencies [6652cd3]
- Updated dependencies [d10c7ea]
- Updated dependencies [903a9c9]
- Updated dependencies [f744bdf]
- Updated dependencies [2de86a6]
- Updated dependencies [2e680e2]
- Updated dependencies [4775892]
- Updated dependencies [d89065e]
- Updated dependencies [149f822]
- Updated dependencies [4766b86]
- Updated dependencies [a30fd81]
- Updated dependencies [8bb10ff]
- Updated dependencies [64ae958]
- Updated dependencies [1ddb0e9]
- Updated dependencies [4766b86]
  - @oztix/roadie-core@2.13.0

## 2.17.1

### Patch Changes

- 716f3f2: Update `@tanstack/react-virtual` to 3.14.22, which Records uses to window long lists of records.

## 2.17.0

### Minor Changes

- 68fc47c: Add `size` (`sm`, `md`, `lg`) to `Checkbox`, `CheckboxGroup`, and `RadioGroup`, and `trailing` to `Checkbox` and `RadioGroup.Item` for a count or value at the end of the row. The default `md` box is now 20px, down from 24px, which also makes RecordTable's and Records' selection checkboxes smaller; pass `size='lg'` to keep the old size. A ticked or indeterminate checkbox and a chosen radio now fill with the accent's strong colour, with the icon or dot in the text colour for strong, and drop the sunken inset of an empty box. Stacked items in a `CheckboxGroup` or `RadioGroup` sit 2px apart at `sm` and 4px at `md`, down from 8px, and stay 8px apart at `lg`. A radio's dot is now half its circle at every size.
- 1cc7929: `DataCard` and `Chart` take `controls`: switches for what the card's body shows, such as a chart's Cumulative, Incremental and Percentage modes. They sit in a full-width row under the headline, wrap on a narrow card, and stay in place in every state and in a chart's Table view. `StatTile` doesn't take them.
- 15435ad: Add `groupBy` and `defaultExpanded` to `DataTable`. Rows group by one or more text or status columns, outermost first. Each group gets a row that sums its number columns the way `totals` does, which opens and closes like an Accordion when anywhere on it is pressed, and every level's label sits indented in the title column, or the first column without a sum when there's no text column. Groups start closed: `defaultExpanded` opens them all, or the groups at the paths of values you give. Sorting orders groups by their sums, or by label, at every level. Dashboard `table` cards take the same two fields, `DashboardView` passes them on, and `validateDashboard` checks them.
- bc66b29: Add `totals` to `RecordTable` and `useRecords`: a row of totals under the headings, over every record the search and filters match. `totals` sums the number and money fields in the browser; with server data, pass the server's sums as `{ values }`, or resolve them from `loadRange` beside `rowCount`. It labels itself "Totals for 1,234 shows" from `recordName`, and reads as one line above the rows on a phone. A column's `total: false` leaves it blank. Tables without `totals` don't change.

### Patch Changes

- 4d0f1bb: Fix an open `Accordion` item growing past its container when it holds wide content, such as a code block, so it no longer pushes a phone page sideways.
- e823161: RecordTable and RecordGrid in a `fill` box centre their empty and error states in the space under the header, instead of showing them at the top. Rows, cards, and loading placeholders still start at the top.
- a889d8d: Fix a ticked or indeterminate `Checkbox` that's `invalid`, which now fills with danger instead of the accent, so the error still shows.
- 6bb2332: Fix pressing a later pinned `DataTable` cell in a linked or grouped row, which now follows the row's link or toggles its group like any other cell. A number column that `groupBy` leaves first also keeps its figures end-aligned, and a linked row's title is a subtle `Link`, underlined in the accent colour while the row is hovered or focused.
- 6115664: Show the total of a number column that comes first in `DataTable`. The totals label, each group's label, and the grouped header now go in the title column, the pinned text column or else the first text column, as in `RecordTable`. A table with no text column puts them in the first column without a sum, so the label never covers a total. `validateDashboard` follows the same rule: it warns about a totals row only when every column has a sum, or when `values` gives one for the label's column, and about grouped rows only when there's no text column and the label's column isn't status. In core, `tableLabelIndex(columns)` finds the label's column, `tableTitleColumn(columns)` the title, and `labelColumnIndex` applies the rule to columns of another shape; `totalsLabel(count, recordName, exact)` writes "Totals for 1,234 shows", with a + after a count that's a floor.
- 37e78f5: A `List` row with long text no longer widens the list past its container on a narrow screen; the title truncates and the trailing slot stays in view.
- 0e0bd9a: Fix an `is-interactive-within` surface taking the hover, press and focus ring of a nested surface's target. A `Card` around a grouped `DataTable`, linked `DataTable` rows or `RecordTable` list rows now stays still when one of those rows is hovered, pressed or focused, and a subtler card keeps its tint. A target now belongs to the nearest `is-interactive-within` around it.
- 4ed0b1d: Fix the rows in a `QueryField` or `Records.Search` list jumping as the highlight moves. The row with the Enter hint was 1px taller than the rest, so every row below it shifted. Each row is now tall enough for the hint.
- bb51c0a: `RadioGroup` now dims a disabled group or item and ignores presses on its row, like `Checkbox`. An invalid group, from `invalid` or its `Field`, draws its empty circles with a danger border and tint, fills the chosen one with danger like an invalid ticked `Checkbox`, and sets `aria-invalid` on the `radiogroup`.
- 3ea2509: RecordTable puts the totals label in the title column, or with no title in the first column without a sum that isn't an image, as `DataTable` does, so the label no longer covers a summed column's total, and in the title column it no longer hides with a column's `priority`. With `totals` and records selected, the bulk actions bar's focus rings are no longer clipped at the top.
- 7fdb3fd: Fix a scrolling `ToggleGroup` jumping back to its pressed item when it resized while keyboard focus was on another item, which hid the focused item. It now keeps the focused item in view, and the pressed one when focus is elsewhere.
- Updated dependencies [574a12a]
- Updated dependencies [15435ad]
- Updated dependencies [6115664]
- Updated dependencies [b15d667]
- Updated dependencies [7835e36]
- Updated dependencies [0e0bd9a]
- Updated dependencies [4d0f1bb]
- Updated dependencies [764944f]
- Updated dependencies [6483954]
  - @oztix/roadie-core@2.12.0

## 2.16.0

### Minor Changes

- 1cda559: Add `Toolbar` (`@oztix/roadie-components/toolbar`), a row of buttons, toggles, links, and menus that takes one Tab stop.

  It wraps Base UI's toolbar, and its parts render Roadie components at the toolbar's `size`: `Toolbar.Button` (a `Button`, an `IconButton` when its only child is an icon, or a routed link with `href`), `Toolbar.Toggle`, `Toolbar.ToggleGroup`, whose pressed fill slides between its toggles, `Toolbar.Group`, and `Toolbar.Separator`. The arrow keys move between items. On touch screens and phones the items scroll sideways on one row, and elsewhere they wrap. It sits in an `emphasis='normal'` surface by default; `subtle`, `raised`, and `floating` change it, and `subtler` drops it for a toolbar inside another surface.

- 72a5b57: Pressing Enter after typing in an `Autocomplete` or `Combobox` now takes the
  first suggestion, without moving to it with the arrows first. Suggestions
  that arrive after typing, such as server results, are highlighted too.

  Opening the list without typing still highlights nothing new, so Enter there
  picks no value, and an empty `Autocomplete` still submits its form. While
  suggestions show for typed text, Enter fills the first one instead of
  submitting; press Escape first to keep the typed text. After typing, the first
  Down Arrow moves to the second suggestion, and the arrows wrap at either end
  instead of returning to the input. `Autocomplete` in `both` or `inline` mode is
  unchanged, since a highlight there replaces the typed text.

  Pass `autoHighlight={false}` to keep the old behaviour. `Autocomplete` also
  takes `autoHighlight='always'` to highlight the first suggestion with no text.

- 0fe97b2: Add brand intents named by hue. `intent-brand-purple` is a new brand intent on the purple scale that `info` also uses, with white labels on its strong fill. `intent-brand-blue` and `intent-brand-orange` are aliases of `intent-brand` and `intent-brand-secondary`, which stay. Every component `intent` prop accepts `brand-blue`, `brand-orange`, and `brand-purple`, and `cn()` treats them as one intent group.

  Add a fixed `--color-{scale}-light-9` token for every scale. Like the light 0, 5, 12, and 13 steps, `.dark` doesn't override it, so brand artwork keeps its step 9 colour in dark mode.

  `text-display-prose-2` is now weight 700 (Bold), down from 800.

- 5a62938: Add `Calendar` (`@oztix/roadie-components/calendar`), a month or week grid for choosing a date, several dates, or a range.

  Every value is an ISO date string, never a `Date`, built on the plain-date math in `@oztix/roadie-core/datetime`. `mode` is `single`, `multiple`, or `range`, with `selected`, `defaultSelected`, and `onSelect`, and a range's `min` and `max` limit its length in days. `disabled` and `modifiers` take matchers: a date, a list, `{ start, end }`, `{ before }`, `{ after }`, `{ dayOfWeek }`, or a function, and each modifier marks its days with a data attribute.

  It fills its container and shows `numberOfMonths` side by side where they fit, or with `layout='scroll'` stacks months under one pinned weekday row. `view='week'` shows one week of larger days, and `views={['week', 'month']}` adds a toggle between them. `direction='vertical'` turns months up and down. A swipe or drag turns the page, and `getDayContent` puts a price or status under each day. `captionLayout='dropdown'` adds month and year selects.

  Focus moves apart from selection, with arrows, Page Up and Page Down (Shift for a year), Home, and End, and a live region announces the month and the selection. Today follows midnight in `timeZone`, and the server leaves today unmarked, so cached HTML hydrates without a mismatch.

- 0eed3da: `Combobox` gains chip parts for multiple selection: `Combobox.Value`,
  `Combobox.Chips`, `Combobox.Chip`, and `Combobox.ChipRemove`, wrapping Base
  UI's, and `Combobox.ChipLabel`, which truncates a long value. Chips are subtle
  pills that inherit the intent around them, with a round remove button.

  The arrow keys move between chips, and a chip with focus turns accent strong
  to show it's selected. Clicking a chip selects it. Backspace in an empty
  `Combobox.Input` selects the last chip, and a second Backspace removes it.
  Escape on a chip returns focus to the input, and Escape in the input while the
  list is closed clears the typed text and keeps every chip, where Base UI
  removes them all. `selected` on `Combobox.Chip` shows it selected while focus
  stays elsewhere.

  `Combobox.InputGroup` and `comboboxInputGroupVariants` now set a minimum height
  for each size (`min-h-8`, `min-h-10`, `min-h-12`) instead of a fixed `h-*`, so
  the group grows when chips wrap. A single line keeps its height, but a child
  sized with `h-full` now takes its content's height instead of the group's.

  `Combobox` takes `autoHighlight='always'` to highlight the first item before
  anything is typed, as `Autocomplete` does.

- 3c9937b: `useFieldControlError(message)` is now public in
  `@oztix/roadie-components/field`. A custom control calls it to show its own
  error, such as a file it couldn't upload, in the nearest `Field.ErrorText`,
  as Roadie's date and time fields already do. Pass `null` to clear it.
- 3c9937b: New `Link` in `@oztix/roadie-components/link`, a text link that routes like
  every link-bearing component: internal hrefs go through the Link given to
  `RoadieProvider`, external ones open in a new tab, and unsafe ones are
  refused. Its `emphasis` sets the look: `normal`, the default, keeps the text
  colour with an accent underline that grows into a tint on hover or keyboard
  focus, the same as links in `.prose`; `strong` colours the text in its intent and
  fills it from the left like `emphasis-strong`, recolouring each letter as the
  fill reaches it; and `subtle` shows its underline only on hover or
  keyboard focus. `normal` and `subtle` stay accent inside any intent unless
  given their own `intent`, `intent='neutral'` included; `strong` follows the surrounding intent, neutral included. The focus
  ring comes from `is-focusable`, and reduced motion skips the transitions.
- 99111f3: Dashboards gain a period and a comparison.

  `@oztix/roadie-core/dashboard`: a description can carry `period: { range,
  compare?, history? }` (`DashboardPeriodSpec`), where `range` is a
  `DateRangeValue`, `compare` a `Comparison` or the app's own, such as
  `'similar'`, and `history` what `resolveComparison` said about the data. A
  delta marked `comparison: true` follows it. `validateDashboard` checks the
  period, and rejects a comparison delta on a dashboard with no period.

  `@oztix/roadie-components`: add `DashboardPeriod`
  (`@oztix/roadie-components/dashboard-period`), one `DateRangePicker` button
  that shows the period and the dates it compares with. Under the range, a
  Compare switch turns the comparison on, and a toggle group picks previous
  period, previous year, custom dates, or the app's own options from
  `compareOptions`. Apply sends both together. Its value is
  `DashboardPeriodValue`, `{ range, compare? }`, and its presets default to
  `dashboardPeriodPresets`. `dataStart`, `dataEnd`, and `alignWeekday` match the
  app's `resolveComparison`, so the comparison shows the dates the app fetches.
  It's a large control, 48px tall, so pair it with large Buttons and Selects.

  `@oztix/roadie-charts`: `DashboardView` shows a description's `period` above its
  sections, and `onPeriodChange` receives the new `{ range, compare? }`; without
  it the period shows read-only. `periodProps` (`DashboardViewPeriodProps`)
  passes the toolbar's other props. A delta marked `comparison: true` names the
  comparison on its context line, such as "vs previous period", and gives way to
  "Not enough history" or "Nothing to compare" when the period's `history` says
  so.

- 816a826: `DataTable` links rows with `getRowHref`. The title cell, the pinned text
  column or else the first text column, becomes a link routed through
  `RoadieProvider`, with external links opening in a new tab. Its overlay covers
  the row, so pressing anywhere on it follows the link, and the row takes the
  link's hover tint and focus ring. The link is the row's only tab stop.
  `getRowHref` runs where the table renders, so a server component can pass it.

  `DashboardView` takes `getRowHref={(card, row) => …}` to link table card rows,
  since a dashboard description is JSON and holds no functions.

- 816a826: `DataTable` sorts in the browser with `sortable`. Pressing a header sorts by that
  column, numbers largest first and text A to Z, and pressing it again flips the
  direction. Empty and text values in a number column stay at the bottom. Start
  from `defaultSort`, or control it with `sort` and `onSortChange`. Sortable
  headers now show a caret: up or down on the sorted column, and a faint up-down
  caret on the rest, styled with `is-interactive` rather than an underlined
  link. `getSortHref` still links headers for server sorting: an unsorted
  number, delta or meter header now links `descending` first, the way a click
  sorts, and sparkline headers no longer link. `sortDataTableRows` sorts rows on
  a server the same way. Sparkline columns don't sort.

  Pinned-cell styles now apply only inside a `DataTable`, so a `data-pin`
  attribute elsewhere on the page no longer makes an element sticky.

- ff2f04d: `DataTable` takes a totals row with `totals`, rendered in a new `Table.Foot`:
  strong text over a rule, its label in the first column as a row header. `true`
  or `'sum'` adds up the number columns over every row, labelled "Totals for 12
  records", or the `recordName` you pass. Shares, indexes, points and columns with
  `total: false` stay blank, and currency sums round to the cent. Give
  `{ label, values }` to show your own figures, such as the server's totals for a
  paged report or an average; with `values`, nothing is summed, and without a
  label the row reads "Totals". The first column holds the label, so it never
  hides while the totals show. `DataTableTotals` types the prop, `true`
  included, and `tableCellClass(align)` gives a body cell's classes, for a `th`
  that heads a row.

  A dashboard table card takes the same `totals`, and columns take `total: false`.
  `validateDashboard` checks them: values need a label and must name a column,
  `'sum'` warns when there's nothing to sum, and either warns when the first
  column, which holds the label, has a total that would never show.
  `cardTable(card)` returns the totals summed, and a `Chart` table view shows a
  `ChartTable`'s totals. In core,
  `resolveTableTotals(columns, rows, totals)`, `isSummable(column)` and the
  `RecordName` and `ResolvedTotals` types come from
  `@oztix/roadie-core/dashboard` and the Zod-free `/dashboard-layout`.

- df311de: Add `DateField` (`@oztix/roadie-components/date-field`), `TimeField`
  (`@oztix/roadie-components/time-field`), and `DatePicker`
  (`@oztix/roadie-components/date-picker`), typed date and time fields built on
  `Calendar` and the date phrases in `@oztix/roadie-core/datetime`.

  `DateField` reads what people type, such as "14 mar", "next fri", "tomorrow",
  or "1/12" (day first), and suggests the dates it could mean. `TimeField` reads
  "7:30pm", "19:30", or "noon". Text is committed on blur or Enter and shown in
  the house style ("Fri 27 Nov 2026", "7:30pm"). Values are plain strings: an ISO
  date, `'HH:MM'`, or null. Text that names nothing stays on screen, sets
  `aria-invalid`, and shows its error in `Field.ErrorText`.

  `DatePicker` pairs a typed date with a calendar in a `Popover`, or below 48rem
  in a bottom `Drawer`. `granularity='minute'` adds a `TimeField`, and the value
  becomes the instant the date and time name in `timeZone`, such as
  `'2026-11-27T19:30:00+11:00'`, so event times are set on the venue's clock.

  All three inherit `invalid`, `required`, and `disabled` from `Field`. The
  picker's calendar button is labelled by the `Field` label too, so a test that
  finds the input with `getByLabelText` should use `getByRole('combobox', { name })`.

  `Field.ErrorText` now also shows a control's own error, such as "Enter a date,
  like 14 Mar or next Fri", even when the `Field` isn't `invalid`.

- 1936d26: Add `DateRangePicker` (`@oztix/roadie-components/date-range-picker`), a button
  showing a date range that opens presets, typed start and end dates, and a range
  `Calendar` in a `Popover`, or below 48rem in a bottom `Drawer`.

  The value is a `DateRangeValue` from `@oztix/roadie-core/datetime`. A preset
  stays relative, so "Last 30 days" is still the last 30 days when a saved view
  opens, and typed or picked dates become an absolute `{ start, end }`. The
  button shows the range in words with the dates it stands for.

  `presets` replaces the default list (`dateRangePresets`), and `commit='apply'`
  holds changes until Apply is pressed, for a dashboard period.
  `granularity='minute'` adds a time to each end, read in `timeZone`. It also
  takes `min`, `max`, `disabled` matchers, `readOnly`, `numberOfMonths`, `size`, and
  `emphasis`, and inherits its label, `invalid`, `required`, and `disabled`
  from `Field`.

- 02a7d71: Add `Kbd` (`@oztix/roadie-components/kbd`), a keyboard key or shortcut drawn
  as a keycap. Known key names show a glyph or short word, `keys={['mod', 'k']}`
  draws a combination with a keycap per key, `combined` draws it on one keycap
  (⌘K, or Ctrl+K off Apple), and `separator` goes between keys, such as `'+'` or
  `'then'` for a sequence. `mod`, `meta`, `shift`, `alt` and `ctrl` follow the
  reader's platform without a hydration mismatch. `emphasis` is `subtle` (the
  default: a soft, borderless keycap tinted from the surrounding text colour),
  `normal` (its own opaque, bordered surface, built on `emphasis-normal`) or
  `subtler` (plain text in the surrounding colour, for menu rows). Kbd is
  `aria-hidden` unless `announce` is set, and is hidden on screens without hover
  unless announced or inside a container marked `data-keyboard-hints='always'`,
  such as a help page about shortcuts.

  `Menu` item `shortcut`s now render through `Kbd` and accept a key list such as
  `['mod', 'd']`. Text such as `'⌘D'` keeps its characters, but a known key name
  given as text now shows its `Kbd` face (`'Enter'` gains the return glyph,
  `'Delete'` reads "Del", `'Shift'` becomes ⇧ on Apple devices) and a single
  letter shows in capitals. Menu shortcuts are now hidden on screens without
  hover. `Tooltip.Content` and `Tooltip.Popup` take a new `shortcut` that shows
  keys after the label.

- 58b2703: `listItemVariants` gains an `interactive` variant, true by default. Set it to
  false for a row whose link or control sits inside it, and style the row with
  `is-interactive-within`, marking that link `data-interactive-target`. Without
  the marked link, a subtler row keeps its tinted fill at rest. `List.Item` is
  unchanged.
- a86fafc: Logo takes every lockup through `variant`: `normal` (the default), `mark`,
  `wordmark`, `tagline`, and `product`. `variant='tagline'` adds Built on
  Partnerships after a divider, from the brand logo pack. `variant='product'`
  needs `product`, and `product` on its own still implies it, so
  `<Logo product='Studio' />` keeps working. The product logo's `data-variant`
  is now `product`. A logo with the tagline is named "Oztix, Built on
  Partnerships".

  `direction='vertical'` sets the wordmark, and any tagline, under the mark, on
  `normal` and `tagline` only. `tone` picks the colour on every lockup: `brand`
  (the default, unchanged), `dark`, or `light`, each the same in light and dark
  mode, or `neutral`, one colour that follows the theme. No tone takes a
  surrounding intent's colour.

  The props are a discriminated union, so passing `product` with another
  variant, or `direction` with `mark`, `wordmark`, or `product`, is now a type
  error. A wrapper that forwards `Omit<LogoProps, …>` loses the union, so its
  spread no longer type-checks; use a distributive omit
  (`T extends unknown ? Omit<T, K> : never`) instead. A runtime `product` still
  wins over any variant. The `LogoDirection` and `LogoTone` types are exported,
  and `LogoVariant` adds `tagline` and `product`.

- a9c7f01: Two components move onto Roadie's motion tokens, and each looks a little different:

  - Badge's pulsing indicator uses `animate-pulse-subtle` (1.8s, fading to 60%) in place of Tailwind's `animate-pulse` (2s, fading to 50%).
  - Image's fade-in uses `--duration-slower` (still 400ms) with `--ease-standard` in place of the CSS `ease` keyword.

- 58b2703: `Pane` publishes `--pane-sticky-bottom`, the height of its `Pane.Footer`, so
  sticky content at the bottom of a pane can clear the footer. A direct child of
  `Pane.Body` marked `data-pane-fill` takes the height the rest of the body
  leaves; give it its own overflow and it scrolls while the pane stays put.
- ac88649: Add `Pattern` at `@oztix/roadie-components/pattern`, the Oztix swirl pattern. It fills its parent with no radius of its own, and its swirls always run off every edge, at a set line weight until the box outgrows the artwork. `crop` (`top`, `bottom`, `left`, `right`, or `banner`, default `right`) says where it sits and anchors the artwork to that edge, or centres it for `banner`. `tone` (`brand-blue`, `brand-purple`, or `brand-orange`, default `brand-blue`) picks its colour, which stays the same in light and dark mode. It's always hidden from assistive technology.
- 6de78c5: `Prose` now renders the core `.prose` class instead of its own list of
  descendant classes. Its sizes only set `--prose-*` variables, and `render`,
  `as`, and `size` work as before. Pages that use `Prose` will look different, so
  check legal pages, FAQs, and content sections after upgrading.

  What changes on the page:

  - Space now goes above each block only, in `em`, from one `--prose-flow`
    variable: 1em at `sm`, and 1.25em at `md` and `lg`. Paragraphs sit 14px
    apart at `sm`, up from 8px, 20px at `md`, up from 16px, and 23 to 25px at
    `lg`, close to the old 24px. The first child sits flush with the top.
  - Space above a heading is a multiple of the body text's flow, not of the
    heading's own size, so a larger heading doesn't push the text above it
    further away. It runs from 3 flows above an `h1` to 2.4 above an `h2`, 1.8
    above an `h3`, 1.4 above an `h4`, and 1.2 above an `h5` or `h6`. At `md`
    that's 48px above an `h2`, up from 32px, then 36, 28, and 24px. At `sm`
    it's 34px above an `h2`, up from 16px, then 25, 20, and 17px, and at `lg`
    it's 54 to 60px above an `h2`. The block after a heading sits half a flow
    below it, 10px at `md`, down from 16px, so each heading stays with the
    section it opens.
  - Tables and code blocks have one body flow above them, like paragraphs,
    rather than a flow at their smaller text size.
  - List items sit 0.4 of a flow apart (8px at `md`, up from 4px), and a rule
    has two flows above it and one below.
  - Each direct child stops at a 65ch measure, so long lines no longer run the
    full width of the container.
  - Body text is 14px at `sm`, 16px at `md`, and the fluid `text-lg` at `lg`,
    all at the prose leading of 1.5. Before, `sm` and `lg` took the tighter line
    height of the page around them.
  - Headings at `md`, the default, use the UI display styles, `text-display-ui-1`
    to `-6`, one step smaller than the prose display styles they used, so
    headings in content such as an event description don't overwhelm the page.
    `sm` headings keep their sizes, apart from `h6`, which drops to `text-sm`,
    and `lg` keeps the prose display styles.
  - Links keep the surrounding text colour with an accent underline that turns
    to the text colour on hover.
  - List indent is 1.5em, so it scales with the size (24px at `md`, as before),
    and a nested bulleted list uses circles.
  - Tables shrink to fit their content instead of filling the width. `Prose`
    wraps each bare table in `.prose-scroll`, so a wide one scrolls sideways on a
    phone.
    Each column of a table in `.prose-scroll` stays at least 9em wide, so when
    the columns can't all fit, the table scrolls rather than squeezing text to a
    word or two a line. A column with short content, such as "Yes", also takes
    9em. A long cell wraps at the prose measure. A table whose columns fit still
    shrinks to fit without scrolling.
    Inline code in a table inside `.prose-scroll` stays on one line, so a name
    such as `rounded-sm` never splits; the table scrolls instead. Outside
    `.prose-scroll`, inline code still breaks where it must so the table fits.
  - Code blocks and images use `rounded-md`, down from `rounded-lg`.
  - Inline code uses the subtle fill, up from subtler, at 0.875em, down from
    0.9em.

  New escapes:

  - `.not-prose` or `data-not-prose` on an element inside `Prose` keeps the
    styles away from it and everything inside it. A `Prose` nested inside one
    stays unstyled.
  - A `Button` or other component that renders an `<a>` inside `Prose` picks up
    the prose underline. Wrap it in `.not-prose`.
  - `.prose-bleed` on a direct child lifts the 65ch measure.

  To restore old behaviour where a page needs it, add a class to `Prose`:

  - Full-width text: `className='[--prose-measure:none]'`.
  - Full-width tables: `className='[&_table]:w-full'`, plus `.prose-bleed` on
    each table, or on its `.prose-scroll` wrapper, so it passes the 65ch measure.
  - The old `md` gap of 1rem: `className='[--prose-flow:1em]'`.
  - The old `md` headings: set `--prose-h1-size: var(--text-5xl)` and
    `--prose-h1-weight: 900`, down to `--prose-h6-size: var(--text-lg)` and
    `--prose-h6-weight: 700`, one text step per level, all at weight 700 but
    `h1`.

  `proseVariants` now returns `prose` and the size variables only.

- cb1ab12: `Prose` makes wide tables reachable and scrollable with the keyboard.

  - `Prose` wraps each bare table in `<div class="prose-scroll is-focusable">`,
    both tables in its JSX children and tables in HTML it renders through
    `dangerouslySetInnerHTML`, such as CMS output. A table already in
    `.prose-scroll`, `.not-prose`, or `data-not-prose` stays as it is, and a
    `.prose-bleed` table passes the class to its wrapper.
  - While a table overflows, its scroller gets `tabIndex={0}`, `role="region"`,
    and a name: the table's caption, else the nearest heading before it with an
    `id`, else "Table". A later table under the same heading is numbered. A table
    that fits adds no tab stop. This also applies to `.prose-scroll` wrappers you
    write yourself.
  - Tables in rendered HTML are wrapped after hydration, and tab stops are added
    after hydration, so server markup still matches.
  - Each column of a wrapped table stays at least 9em wide and its inline code
    stays on one line, as in any `.prose-scroll`, so a table that used to squeeze
    into its column now scrolls.
  - A table that a component renders inside `Prose` isn't wrapped, since React
    owns it. Wrap it in `.prose-scroll` yourself.
  - `Prose` still renders in server components, with any `as` or `render`. Its
    root gets a `data-prose-id`, which links it to a client component that
    renders nothing and does the work in the browser.

  New `useScrollRegion(ref)` from `@oztix/roadie-components/scroll-region` gives
  any scroll container the same keyboard access, for tables outside `Prose`.

- 7b8d0da: Add `QueryField` (`@oztix/roadie-components/query-field`), a search field that turns what you type into filter chips.

  It takes your chips and a `suggest` function, lists suggestions in the groups you return with a "Search for …" row, and hands what was taken to `onAccept`. Enter searches the typed text unless a suggestion is marked `exact`, and filters are taken by arrow or click. A suggestion's `remainder` stays in the field once it's taken, so "melb this weekend" can take Melbourne and keep "this weekend" for the next one.

  A `pendingChip` runs a value step: picking a field, such as Venue, shows its values, under a toggle of `operators` when it has more than one, with an optional `hint` and `content`, such as a calendar. `onSelectChip` and `pendingChip.chipId` edit an existing chip in the list. `locked` chips, such as the page's scope, come first and nothing in the field removes them. Backspace in an empty field selects the last chip, then removes it, and `focusShortcut` focuses the field from anywhere on the page. It works alone with `aria-label` or inside `Field`.

- 7670b03: Add `RecordGrid` (`@oztix/roadie-components/record-grid`), records as a grid of cards to search, filter, sort, and page through.

  `gridLayout({ title, description, image, leading, trailing, details })` gives `Records.Root` the grid layout, each part a field's key or `{ key, alt, cell }`. Cards are at least 16rem wide, as many columns as fit, and `image` is a 16:9 banner. The grid selects through Select mode, and pages, loads by range, and renders only the rows near the screen past 100 records, as the table does. `Records.Options` shows, hides, and reorders the card's details. `RecordGrid` takes the card's parts as `card`, which needs a `title`, and the same records and header options as `RecordTable`.

- 85a054f: Add `RecordTable` (`@oztix/roadie-components/record-table`), a table of records to search, filter, sort, and page through, built on the records model in `@oztix/roadie-core/records`.

  `@oztix/roadie-components/records` holds the parts it's built from. `useRecords` takes the records, their fields, a `RecordView`, and a `RecordPosition`, each controlled or not, and returns a `RecordsInstance`. `Records.Root`, or `Records.Provider` for parts spread across a `Pane`, shares it with `Records.Header`, `Records.Search`, `Records.Content`, `Records.Pagination`, `Records.Status`, `Records.Options`, `Records.Select`, `Records.Actions`, `Records.BulkActions`, and `Records.ViewActions`. `RecordValue` shows one value as its field reads. `tableColumns(fields).field(key, options)` and `tableLayout(columns)` describe the table.

  - `Records.Search` is a `QueryField` named "Search and filter". It searches the searchable fields and turns typed text, such as "melb this weekend", into filter chips. Picking a field lists its values under a toggle of operators, with a calendar for dates. A field can carry an `icon` (`RecordsField`) for its suggestions.
  - `scope` takes the filters a page sets, such as the event a list of tickets belongs to. They show as locked chips and are never part of the view.
  - The table sorts from its headers, pins columns, and scrolls sideways with a Roadie scrollbar. Columns with a `priority` hide as it narrows, and under 40rem it lists its records as list rows or cards. Past 100 rows, only the rows near the screen render.
  - `Records.Options` is the Configure button: the sort, the columns to show, hide, and reorder, and a Layout switcher when there's more than one layout.
  - `bulkActions`, `rowActions`, `getRowHref`, and `actions` act on records. Each action gets the applied query and the `RecordsRequest` for its records. `downloadCsv` saves CSV from `recordsToCsv`.
  - `baseline` is the saved view the screen opened, so `modified` and `resetView` work, and `Records.ViewActions` offers Save, Save as new, Rename, Reset, and Delete through your handlers. Your app stores the views.
  - `rowCount` turns on server mode, where `onRequestChange` hands over the `RecordsRequest` to fetch, and `rowCountExact={false}` marks a count the server stopped at. `loadRange` loads one long list by range as people scroll.

- e3b095a: Each package now ships `roadie.manifest.json`, a machine-readable catalogue for coding agents and tools. Import it from `@oztix/roadie-core/roadie.manifest.json`, `@oztix/roadie-components/roadie.manifest.json`, or `@oztix/roadie-charts/roadie.manifest.json`. It lists every export path with the values and types it exports, every component with its props in the order its source declares them, compound parts, and, where it has them, its docs page and first live example, every deprecated export and prop with its replacement, and, in core, the design tokens. The build generates it from the same source it publishes, so it always matches the installed version.
- e8751a7: Select-style triggers now use a visible border instead of the raised look. `Select.Trigger`, `DateRangePicker` and `DashboardPeriod` default to `emphasis-normal`, with no shadow or rim light, and keep the field states for hover, focus, open and invalid.

  Adds `emphasis='subtler'` to the same three: no fill or border at rest, as wide as its value and icon rather than its container, the hover and press of a subtler `Button`, a danger edge when invalid. `Records.Pagination` uses it for rows per page, so it sits with the subtler page buttons beside it, and keeps the width of its widest option as the page size changes.

- ebc4db6: Add `Sortable` (`@oztix/roadie-components/sortable`), drag to reorder built on
  the browser's native drag and drop. `Sortable` takes the item values in order
  as `items` and reports `onReorder(next, { value, from, to })`; `Sortable.Item`
  marks each item and `Sortable.Handle` drags it. `disabled` on an item stops
  it being dragged or moved from its own menu, while other items can still move
  past it. Clicking or tapping the handle, or pressing Enter or Space on it,
  opens a Move menu (up, down, to top, to bottom; left, right, start and end for
  `orientation='horizontal'`) for keyboard and screen reader users; a press that
  turns into a drag doesn't. Focus returns to the moved item's handle, and each
  move is announced in a polite live region.
  The drop line is accent coloured, the dragged item dims in place, and a
  scrolling container scrolls while you drag near its edge.

  The package gains three runtime dependencies for this:
  `@atlaskit/pragmatic-drag-and-drop`, `@atlaskit/pragmatic-drag-and-drop-hitbox`
  and `@atlaskit/pragmatic-drag-and-drop-auto-scroll` (Apache-2.0). Only
  `Sortable` imports them, so importing other components, including `List`,
  doesn't load them. Importing everything from the root barrel adds about 10 kB.

  `List.Item` takes a `value`. Inside a `Sortable` the row becomes reorderable:
  a drag handle leads, and the row is static, so it ignores `href`, `onClick`,
  `current` and `chevron` (a development warning names `href` and `onClick`).
  Outside a `Sortable` the row is unchanged.

- ff2f04d: Tables take a `status` column kind. The value is a status key, and the column's
  `status` map gives each key an intent and an optional label, which defaults to
  the key in sentence case, so `on_sale` reads "On sale". A key the map lacks
  shows as neutral, in its raw text.

  `DataTable` shows it as a small `Badge` in normal emphasis, or as the label in
  a `plain` table. It sorts by label, or by each key's `order` when the map gives
  one, with keys that have no order last. An empty status shows the column's
  `emptyText` and sorts last. A `secondaryKey` adds a line under the badge, or
  under the label in a `plain` table, styled and wrapped as it is on a text
  column. An empty secondary value adds no line, on either kind.

  In core, `TableColumn` takes `kind: 'status'` and `status`, and
  `validateDashboard` rejects an unknown intent and warns about keys a map lacks.
  `columnStatus(column, key)` resolves a key's intent and label, and
  `cellText(column, value)` gives any cell as the plain text its table shows,
  and `humaniseStatus(key)` gives a key's default label. They come with the
  `STATUS_INTENTS`, `StatusIntent`, `TableStatus` and `ResolvedStatus` types, and
  also from the Zod-free `@oztix/roadie-core/dashboard-layout`. A `status` map on
  a column of another kind gets a warning, as does a `secondaryKey` on a column
  that is neither text nor status. `COLUMN_KINDS` gains `'status'`, so an
  exhaustive `switch` over a column's `kind` needs a case for it.

- fad898f: A nested `ThemeProvider` scopes its accent to its own subtree. It sets `--accent-hue` and `--accent-chroma` on a `display: contents` wrapper marked `data-accent-scope`, which renders on the server too, and Roadie's CSS declares the accent and neutral scales, the default intent, the shadows, and the chart ink again on that wrapper. Before, a nested provider wrote its accent to `:root`: it lost to the root's on a cold load, took over the whole page when it mounted later, and kept the page on its accent after it unmounted. Now the root's accent stays on everything outside the nested provider, and the portals of `Dialog`, `Drawer`, `Popover`, `Menu`, `Tooltip`, `Select`, `Combobox`, and `Autocomplete` carry the nested accent to popups that open from inside it. A parent's selectors for its direct children, such as `*:` variants, now see the wrapper instead of the nested provider's children. A nested provider's subtree starts at the neutral intent, and browsers without OKLCH keep the root's accent inside it. A nested provider with `accentColor={null}`, no accent, or an invalid one, and no `defaultAccentColor`, inherits the accent around it, whether the root's or an enclosing nested provider's, and so do its popups. It sets no scope, so its subtree also keeps the intent around it, and the subtree doesn't remount when an accent arrives. The root provider still falls back to Oztix blue.

  The root provider keeps a server-injected accent style that already holds its accent (from `getAccentStyleSync`, `getAccentStyleTagSync`, or `getBootstrapScript`) instead of rewriting it on hydration, and writes the accent in the same form. `RoadieProvider`'s warning for a `RoadieProvider` inside a `ThemeProvider` now says the inner theme is scoped to its subtree.

  Update `@oztix/roadie-core` together with `@oztix/roadie-components`, since the wrapper needs core's scoped selectors to change the scales.

### Patch Changes

- d8a0ad6: Tapping the active tab of a collapsed `Navigator` bar on its own route now
  scrolls the page back to the top in browsers with the Navigation API, such as
  Chrome. A pane now restores a remembered scroll only when you arrive at it:
  going back or forward, or changing destination.
- ddcad84: Buttons now follow their parent's alignment. The `btn` utility set
  `place-self: start`, which overrode a flex row's `items-center` and a grid's
  `justify-items`, so every `Button`, `IconButton` and `Toggle` in a taller row
  sat at the top. It now sets `width: fit-content` instead. With a size class
  (every `Button`, `IconButton` and `Toggle` has one), a button keeps its own
  size in a grid cell or a flex column and takes the row's `align-items`
  (including `items-baseline` and `items-end`), a grid's `justify-items`, or a
  flex column's `items-center`, as in a horizontal `Card`'s side-column footer.

  To widen a button, use `w-full`. `self-stretch`, `justify-self-stretch` and
  `place-self-stretch` no longer widen it. To undo `w-full` at a breakpoint, use
  `w-fit` rather than `w-auto`, which now lets a grid or flex column stretch it.
  If you load `@oztix/roadie-core/css/compiled` beside your own Tailwind build,
  import it before your utilities so `w-*` on a button still wins.

- e2007ba: `CalendarTile` no longer puts its month or weekday in capitals, because the
  writing rule keeps all caps for acronyms. The tile shows `Nov`, not `NOV`, and
  the band drops the wide letter spacing that only suited capitals.

  Mixed case reads smaller than capitals, so the band's text is one size bigger
  and still scales with the tile: 10px at `sm` (was 9px), `text-xs` (12px) at
  `md` (was 10px), and `text-sm` (14px) at `lg` (was 11px). The band also has a
  set height, about a third of the tile: 14px at `sm`, 16px at `md`, and 18px at
  `lg`, with 2px of vertical padding and the text centred.

  The `calendar-tile-top` utility changes the same way. The React tile now uses
  that utility for its band, and marks its size with `data-size`, so the two
  render an identical band.

  `formatGlyph` now returns `month` and `weekday` as the locale abbreviates them
  (`Nov` and `Fri` in English) rather than uppercased. Some locales abbreviate
  in lowercase, such as `nov.` in French, and the tile shows that as given. If
  you pass your own strings, pass them in sentence case.

- 5484613: Warn in development when a `Card` has no `Card.Content`. `Card.Header` has no bottom padding, so a card with only a title and description puts them in `Card.Content`. `Card.Content` registers with its card, so it counts inside a fragment or your own component, and production builds skip the check. Keep a `Suspense` boundary inside `Card.Content`, not around it, or the card warns while it loads. A `RecordGrid` or narrow `RecordTable` card with no details now renders its title row as the card's `Card.Content`.
- cc83b4f: A `Carousel` with `autoPlay` now moves to the next slide once the delay has
  passed. Before, it never advanced: Embla re-initialises when the slides
  mount, the carousel resizes, or slides change, and each time it stopped the
  autoplay timer without starting it again. Autoplay now resumes after each of
  these, unless the user has paused it with `Carousel.PlayPause` or the pointer
  or focus is inside the carousel, in which case it resumes when they leave. A
  user who prefers reduced motion still gets no autoplay.
- c842876: An `Autocomplete` or `Combobox` input inside a `Field` keeps the `Field.Label`
  as its accessible name while its list is open. Opening the list hides
  everything outside it from assistive tech, including the label, so the input
  now also points at the label with `aria-labelledby`. Your own `aria-label` or
  `aria-labelledby` still wins.
- 189296c: Carousel runs on Embla 9.0.0-rc04. When the carousel or a slide resizes,
  Embla now re-initialises on the next animation frame, once per frame, instead
  of inside the `ResizeObserver` callback. Code that listens for `reinit`
  through `useCarouselUnsafeEmbla()` sees it a frame later.
- e7e4efb: Link components check for unsafe `href` protocols with `isUnsafeHref` from `@oztix/roadie-core/utils`, so they also refuse an unsafe protocol hidden with a tab, line break, or control character.
- 5e9a8bd: `@oztix/roadie-core/theme` exports `DEFAULT_ACCENT_COLOR`, so components, widgets, and apps share one default accent. Its value is `#0191eb`, the accent step 9 that tokens.css ships. `@oztix/roadie-components` re-exports it, and its value changes from `#0091EB` to `#0191eb`, one step of red apart, so the default matches the tokens. The Vue cart drawer theme reads the same constant.
- 0b234a4: Update the `Select`, `Combobox`, and `Autocomplete` popups, the `QueryField`
  operator bar, the `Popover` arrow, and the `Tooltip` arrow to use
  `--intent-bg-floating`, so in dark mode they match the lifted fill of other
  floating surfaces. The three popups also lift `text-subtle` on that fill, as
  `emphasis-floating` does, so group labels and empty messages keep their
  contrast.

  A raised `Pane` and the inspector drawer publish the fill they paint as
  `--pane-surface`, so their sticky header matches the lifted dark fill, and
  `Pane.Search` lifts its field off a raised `Pane` in dark mode.

- ff2f04d: A `DataTable` whose rows link keeps its title column visible. The title holds
  each row's only link, so its `priority` is now ignored while rows link, with a
  warning in development, instead of hiding the column and the row links with it.
- 496217b: A link with `download`, such as `<Button href='/files/lineup.pdf' download>`,
  now renders a plain `<a>` instead of the provider's Link. A file isn't a route,
  and Next.js prefetched it as one and logged a 404. Because the router no longer
  handles it, add any base path to a download `href` yourself.
- eb8cb85: Large pages in Chromium no longer restyle every element when something small
  changes, such as opening a menu, ticking a row, hovering a list row, or typing
  in a search. On a large page inside `Navigator` or `Pane` that took up to 3
  seconds of style work at 4x CPU. The styles for `List` dividers and contained
  rows, `Navigator.Brand` and `Navigator.Item`, the ticket `Card` fill, the
  disabled `Switch` label, `DataTable`'s Show all columns, and
  `is-interactive-within` now select only what they style. Nothing looks
  different.

  `listItemVariants()` now carries the classes that square a row inside a
  contained `List`, so a custom row built from it still matches `List.Item`.

- d72d07b: Example data uses invented venue, event and promoter names from the contributing guide's vetted list, so no example reads as a real Oztix client. Affects the chart examples from `@oztix/roadie-charts/examples` and JSDoc in core records and QueryField.
- 853d76c: Add each component's status to `roadie.manifest.json` even when another page documents it, such as `CheckboxGroup` on the Checkbox page or `Records` on Records model, and add `docs` and `status` to core's records subpaths. Status is one of `alpha`, `beta`, `stable`, or `deprecated`, as the docs define them: alpha can break in a minor release, beta is settling and marks a breaking change as Breaking, stable follows semver, and deprecated is being removed. Many long-standing components are now `stable`, and `RecordTable`, `RecordGrid`, `QueryField`, and the records model are `alpha`.
- 53c9b64: Menu radio and checkbox items keep their shortcuts lined up when one is checked.
- 7d6da50: Dialog's backdrop, Card's image, NumberField, Steps, and Switch time their transitions with Roadie's motion tokens in place of the Tailwind values they matched, so they follow a token change. Nothing moves differently.
- 8a7b4c5: On a phone, `Navigator` no longer pulls its panes back while a navigation is
  pending for someone who prefers reduced motion. The pending colour still
  shows; only the movement is gone.
- daa17b3: Navigator's pending glow draws its spinning square small and scales it up.
  The conic gradient sits on a square an eighth of the frame's diagonal, scaled
  eight times, rather than one drawn at one and a half times the frame's long
  side. Under heavy load Safari could show the frame's corners while the old,
  very large layer turned. The square still covers the frame at every angle,
  and reduced motion still holds it still.
- 4693788: Navigator no longer logs React's "Each child in a list should have a unique
  key" warning when a route's child streams in. It used to copy its children
  with `Children.toArray` to lift out `Navigator.Primary`, and those re-keyed
  copies flagged a child that had skipped JSX's key check, such as a promise
  React unwraps. It now renders the rest of its children as given, so apps no
  longer need to wrap route children in a fragment.
- 230a991: `DateTime` no longer reads the clock while rendering on the server, so it
  prerenders under Next's `cacheComponents` without a `Suspense` boundary,
  including as a `Suspense` fallback.

  The date formatters read the clock only when the words depend on it: a
  standalone date's year, or relative text. A `DateTime` with
  `context='standalone'` renders its year on the server, then drops it after
  mount when the date is in the current year. Client-rendered output is
  unchanged.

- 0a72e40: Every focus ring now has the same shape: 4px wide with no gap, from the `--focus-ring-width`, `--focus-ring-opacity`, and `--focus-ring-opacity-dark` tokens. Plain links and buttons with no Roadie class, such as links in CMS content, now get a 4px ring with no gap, where they had a 2px ring with a 2px gap. The ring's colour is unchanged: it still follows the nearest intent, and fields still use accent, or danger when invalid.

  Components that drew their own ring now use the base ring, so they follow the nearest intent too: a focused chart plot, Toast, and ScrollArea's viewport. The bare NumberField stepper's ring loses its 2px gap. ScrollArea's viewport and the `subtler` Tabs keep the ring inset by its width so their container doesn't clip it.

- 58b2703: `Pane.Footer` has a little more room above its content and casts a soft shadow
  up over the body. A `Pane` outside a `Navigator` no longer pads its bottom for a
  phone tab bar that can't be there, so its footer sits at the bottom on phones.
- 494b3f5: A `Pane` now remembers its scroll for the history entry you're on, even after
  a push that keeps the same `Navigator` value, such as a change to the query
  alone. Before, it kept saving to the entry it was on before the push, so going
  back put the pane at the newer entry's position. Going back or forward to an
  entry on the same route now restores that entry's scroll too.
- d27a4c0: `Autocomplete` and `Combobox` now list the closest matches first as you type,
  so the highlighted first option, and Enter, take the likeliest one. An exact
  match leads, then labels that start with the text, then labels with a word
  that starts with it, then labels that contain it anywhere. Matches of the same
  kind keep the order of `items`, grouped items are ranked within their group,
  and case and accents don't count. Typing "Rock" over `['Hard rock', 'Rock']`
  now lists Rock first. With `limit` on a flat list, ranking comes first, so the
  closest matches are the ones kept; grouped items fill the limit group by group,
  in your group order.

  `Combobox` opened without typing still shows `items` in your order.
  `Autocomplete` ranks by its value, whether typed or set in code. Pass your own
  `filter` or `filteredItems` to keep your order. Server results passed as
  `items` without `filter={null}` are now re-ranked; add `filter={null}` to keep
  the server's order. A `Combobox` given a `createItems()` collection keeps its
  order.

  For grouped items, pass a function to `Autocomplete.List` or `Combobox.List`
  rather than mapping your source groups inside it, so the groups filter and
  rank.

- a9a6b8a: Add selection utilities, so a set of choices takes its label colours from the system rather than from each component. `is-unselected` marks an unchosen item: subtle text that lifts to normal text on hover. `is-selected-label` and `is-selected-label-on-strong` give a chosen item the label of `is-selected` or `emphasis-strong` when an indicator behind it draws the fill.

  `Toggle`, `ToggleGroup` and `Tabs` now compose these utilities. An unpressed `subtler` `Toggle` now lifts its label to normal text on hover, as `ToggleGroup` and `Tabs` items already did. A `text-*` class passed to a subtler `Toggle`, a `ToggleGroup` item or a tab no longer changes its label colour, because these utilities now set it.

- b2c534d: `Switch` renders a native `<button>`, so a bottom `Drawer`'s swipe no longer
  swallows a tap on it, and its label's `for` now points at the switch itself.
- cf4f202: A horizontal `ToggleGroup` that runs out of room now scrolls sideways, as
  `Tabs` does, instead of squashing its items until the labels overflow. It
  scrolls the pressed item into view, and a focus ring stays inside the track. A
  side with more items to scroll to fades out, and the arrow keys, Home, and End
  scroll each item they focus clear of it. Items keep equal widths while
  they fit.
- b2c534d: `Autocomplete` and `Combobox` options can be chosen with a tap on an iPhone.
  Before, WebKit dropped the tap's click, so a tapped suggestion closed the list
  without choosing. Touch and pen now choose an option when the finger lifts on
  the option it went down on, and the list stays open while the finger is down,
  even if the input blurs as the keyboard goes. A drag or a scroll chooses
  nothing, and the mouse events that follow a tap don't choose again or land on
  whatever the choice put under the finger.
- b0e7656: Widgets now ship `@oztix/roadie-widgets/roadie.manifest.json`, with the same shape as the other packages' manifests. It lists every export, including the Vue skins, and describes the React components (`CartDrawer`, `CartExpiryDialogs` and `CartContents`) with their props and docs pages. The Vue skins appear as exports only. Deprecated re-exports, such as `CartExpiryModals` and the `cart-drawer/core` shim, are listed under `deprecations`.

  Every component in the components and charts manifests now has a `docs` link. The spot illustrations, `RoadieProvider`, `RoadieLinkProvider`, `ThemeProvider`, `RequiredIndicator`, `OptionalIndicator`, `LegendKey` and `DashboardView` link the page or section that documents them.

- Updated dependencies [9196e9a]
- Updated dependencies [0fe97b2]
- Updated dependencies [ddcad84]
- Updated dependencies [e2007ba]
- Updated dependencies [cc39346]
- Updated dependencies [4c9bc5c]
- Updated dependencies [5e9a8bd]
- Updated dependencies [9596020]
- Updated dependencies [e7e4efb]
- Updated dependencies [d52ab01]
- Updated dependencies [bf0ec67]
- Updated dependencies [54c87b2]
- Updated dependencies [e7e4efb]
- Updated dependencies [b74a7bd]
- Updated dependencies [1336d18]
- Updated dependencies [7fe7954]
- Updated dependencies [0b234a4]
- Updated dependencies [99111f3]
- Updated dependencies [ff2f04d]
- Updated dependencies [156ca60]
- Updated dependencies [c09a86a]
- Updated dependencies [f57dfba]
- Updated dependencies [eb8cb85]
- Updated dependencies [60bebfd]
- Updated dependencies [94c5e81]
- Updated dependencies [d72d07b]
- Updated dependencies [c324014]
- Updated dependencies [8b5de45]
- Updated dependencies [0c67df7]
- Updated dependencies [853d76c]
- Updated dependencies [230a991]
- Updated dependencies [0a72e40]
- Updated dependencies [fe925b2]
- Updated dependencies [83e9966]
- Updated dependencies [ed68775]
- Updated dependencies [ba7ede5]
- Updated dependencies [e3b095a]
- Updated dependencies [a9a6b8a]
- Updated dependencies [ff2f04d]
- Updated dependencies [1ae382b]
- Updated dependencies [fad898f]
  - @oztix/roadie-core@2.11.0

## 2.15.0

### Minor Changes

- c95a44e: Add `Avatar`, a person's photo with initials or an icon behind it, built on Base
  UI's avatar primitive. `<Avatar src name />` covers most uses: it draws initials
  from `name`, falls back to a user icon without one, and shows whichever is
  underneath if the photo fails. `Avatar.Image` and `Avatar.Fallback` compose it
  by hand, and the image stays mounted so it lazy loads and can render through
  Roadie `Image`. Sizes run `xs` to `xl`, `shape` is `circle` or `square`, and the
  fallback takes the surrounding intent. `Avatar.Group` overlaps a row of avatars
  with a ring in the page colour, and `Avatar.GroupCount` ends it with `+N`.
  `getInitials` is exported too.
- 4aeab89: Add `Callout`, an inline message that sits in the flow of the page. The short
  form takes `intent`, `title` and the body as children, and shows a status icon
  for `info`, `success`, `warning` and `danger`. The compound form
  (`Callout.Icon`, `Callout.Title`, `Callout.Description`, `Callout.Actions`)
  covers actions and rich bodies; actions sit below the text in a narrow callout
  and beside it in a wide one. `emphasis` takes Badge's values and defaults to
  `subtle`, `onDismiss` adds a dismiss button, and `Callout.Title` becomes a
  heading through `render`.
- 686e594: Add `Checkbox` and `CheckboxGroup`, styled as siblings of `RadioGroup`.
  `Checkbox` takes a `label` and `description`, shows a tick or, when
  `indeterminate`, a dash, and picks up `invalid`, `required` and `disabled`
  from a surrounding `Field`. `CheckboxGroup` tracks an array of ticked values,
  lays out vertically or horizontally in `subtler` or `normal` emphasis, and
  supports a parent "select all" item through `allValues` and `parent`.
- 97854ae: Add `Collapsible`, a single panel that a trigger shows and hides.
  `Collapsible.Trigger` shows a trailing caret that turns when open (`showCaret={false}`
  hides it) and renders onto a Roadie `Button` through `render`.
  `Collapsible.Panel` passes `keepMounted` and `hiddenUntilFound` through.
  `Collapsible.Text`, placed inside a `Collapsible`, clamps a paragraph to `lines` (3 by default) and ends the
  last line with an inline "…more" that fades the text behind it. The trigger shows
  only when the text overflows; `lessLabel={null}` makes it expand only. The
  `Collapsible` root now owns the open state and shares it with its parts.

  `is-disclosure-animated` now also animates Base UI panels that aren't `<details>`,
  by height from `--collapsible-panel-height`.

- 200dbed: Add the dashboard components: `Dashboard` with named card sizes that reflow by
  container width, `DataCard`, `StatTile`, `Delta`, `Sparkline`, `Meter`,
  `DataTable` with inline sparkline and meter columns that hide by priority on
  narrow cards, and general `Table` primitives. Every one renders completely on
  the server.
- e0371c6: Nine chart types for event and ticketing insights, built on TanStack Charts:
  `LineChart` (with band, median, forecast, target, today and annotations),
  `BarChart`, `RankedBars`, `StackedBars`, `Histogram`, `Funnel`, `Heatmap`,
  `Scatter` and `SmallMultiples`. Each renders live with Roadie tokens, on the
  server, and as standalone SVG through `renderChartSvg` in
  `@oztix/roadie-charts/static`, which also exports each chart's definition.
  Each chart's Table view rows come from `@oztix/roadie-charts/tables`, which a
  server can call without the chart engine. A chart inside a `Chart` card now
  supplies the card's table and summary, so `table` is optional, and a chart
  that can't draw puts its card in the error state.

  The `Chart` card's Chart and Table switch is now an icon-only `ToggleGroup`,
  because both are views of the same data. Each item is a button with
  `aria-pressed` and `aria-controls`, and the hidden view is `inert` but keeps its
  box, so the card height holds across the switch. There are no `tab` or
  `tabpanel` roles any more. `ToggleGroup` keeps focus on the item you left when
  the window regains focus, instead of moving it to the pressed item.

  Cards take actions at the top right. `Chart` has an `actions` prop that sits
  after the Chart and Table switch, and `DashboardView` has a `cardActions` render
  prop that adds actions to every card kind described as data.
  `DataCard.MoreButton` is the More button that ends a card's actions. It passes
  its props and ref through, so it is the trigger of the card's `Menu`, passed to
  `Menu.Trigger` as its `render`. `@oztix/roadie-charts/tables` adds `plotTable`,
  the Table view rows for any chart plot in a dashboard description, and
  `cardTable`, the table behind any card, for actions such as Download CSV.
  `DataCard` now shows its actions in every state, so a refresh works on a card
  that failed to load; `Chart` hides only its view switch without data. Repeated
  `BarChart` x values add up their bars, and the `line` keeps the first value it
  has.

  In core, a chart card's `plot` accepts every chart kind, each with its own
  schema exported from `@oztix/roadie-core/dashboard`, and `validateDashboard`
  checks plot fields, annotations outside the data and repeated names. A legend
  item takes `median: true` to draw a dashed median through a `band` key, in
  `ChartLegend` and in a dashboard description alike, and `validateDashboard`
  warns when a median sits on any other shape. `parseWallTime` in
  `@oztix/roadie-core/dataviz` reads an ISO string as venue wall time, and
  `isWallTime` says whether a value is one. Both accept a space in place of the
  `T`, as in `2026-11-14 19:30`, read the whole string and refuse a date that
  doesn't exist, such as 31 February. `--chart-highlight` now follows nested
  accent, dark and intent sections. Inline `code` no longer splits a short name
  across lines; it breaks mid-token only when the token can't fit a line.

- 4697bd3: Align existing form controls and Popover with the newer components.

  - `RadioGroup` and `Select` inherit `disabled` from `Field`. Their own
    `disabled` prop still wins.
  - `RadioGroup.Item` uses `description` to describe the radio, not to name it.
    `label` and `description` accept any React node.
  - `RadioGroup.Label` names the group when you use it.
  - `Popover.Content` takes `side`, `align`, `sideOffset` and `alignOffset`
    directly, like `Tooltip.Content`. They win over the same keys in
    `positionerProps`, which are now deprecated. `Tooltip.Content` gains
    `alignOffset`, so Tooltip, Menu and Popover take the same four.
  - The `intent` prop on `Input`, `Textarea` and `Select.Trigger` is deprecated.
    Form controls take their colour from state, and `is-interactive-field`
    handles it. It still works and will be removed in v3.

- 4e50f4a: Add `Menu`, a dropdown list of actions that opens from a button.
  `Menu.Content` wraps the portal, positioner and popup and takes `side`,
  `align`, `sideOffset` and `alignOffset` directly. Items take a leading `icon`,
  a trailing `shortcut` and an `intent` (use `danger` for destructive actions).
  `Menu.Item` takes an `href`, routed through `RoadieLinkProvider`. Checkbox and
  radio items, groups with labels, separators and submenus are included, and
  Navigator menus now share the same surface and row styles. On a touch screen a
  tapped row that keeps the menu open no longer stays highlighted; the keyboard
  highlight still shows.
- 6acda84: Add `NumberField`, a number input with decrement and increment buttons, built on
  Base UI's number field primitive. `<NumberField min={0} max={10} />` renders the
  whole stepper; compose `NumberField.Group`, `Input`, `Decrement`, `Increment`
  and `ScrubArea` when you need a different layout. The buttons turn off at `min`
  and `max`. `format` takes `Intl.NumberFormat` options for currency, percentages
  and units. It inherits `invalid`, `required` and `disabled` from `Field`.

  - `size` and `emphasis` work like `Input`. `emphasis='subtler'` drops the field
    box for round buttons, sized like `IconButton`, either side of the value.
  - `Decrement` and `Increment` take `emphasis` and `intent`, so
    `<NumberField.Increment emphasis='strong' intent='accent' />` gives an accent
    add button.
  - `removable` turns the decrease button into a Remove button with a trash icon
    one step above `min`.
  - `editable={false}` stops typing while the buttons and arrow keys still step,
    unlike `readOnly`, which stops every change.
  - The field is only as wide as its widest value, from `min`, `max` and
    `format`. A typeable value keeps a tap target of at least 2.75rem, 3.5rem on
    touch screens, and at `subtler` sits in a chip that behaves like a subtle
    `Input`. Pass `className='w-full'` to stretch the field.
  - The value animates with NumberFlow at every emphasis, using the same `format`
    and `locale`, and stays still for people who prefer reduced motion.

- 10ae9b5: Add `OTPField`, a one-time code input with one slot per character. `<OTPField
  length={6} />` renders every slot, and `groupSize={3}` splits them 3-3 with a
  separator. Compose `OTPField.Input` and `OTPField.Separator` for other layouts.
  Slots look like `Input` and match its 32, 40 and 48px heights. Pasting a full
  code fills every slot, the first slot offers `autoComplete='one-time-code'`,
  numeric codes bring up the number pad, and `onValueComplete` fires once the last
  digit lands. It inherits `invalid`, `required` and `disabled` from `Field`.
- 6ec114f: Add `Progress`, a bar for a task underway.
  `<Progress value={40} label='Uploading' />` renders the label, the value and
  the track; `valueText` swaps the percentage for text such as "120 of 400" and
  reads it to screen readers. Pass `value={null}` while the length is unknown
  and the bar sweeps across the track. The parts (`Label`, `Value`, `Track`,
  `Indicator`) compose for custom layouts. The fill is the accent by default,
  like `Meter`, and takes the intent when you pass `intent`, such as `success`
  or `danger` once a task has ended. Core gains the `animate-indeterminate`
  utility behind the sweep, which holds a still, soft bar under reduced motion.
- 037bd53: Add `RoadieProvider`, one root provider for a Roadie app:
  `<RoadieProvider link={NextLink}>{children}</RoadieProvider>`. It mounts
  `RoadieLinkProvider`, `ThemeProvider`, `Toast.Provider` with a `Toast.Viewport`,
  `Tooltip.Provider` and Base UI's `DirectionProvider`. Each part takes its usual
  options through `theme`, `toast` (plus the viewport's `position` and
  `container`), `tooltip` and `direction`, and `false` leaves it out. Every
  individual provider stays exported, and a nested one still overrides its part.
  In development, Roadie warns when a `RoadieProvider` sits inside another one,
  or when a `ThemeProvider` or `Toast.Provider` it already mounts wraps it or
  sits straight inside it.

  Top toasts now clear `Pane.Header`. A `Navigator` frame tracks the bottom of
  the tallest pane header along the top of the window, and keeps it in step as
  the header collapses, so `top-end` and `top-center` toasts sit just below it.
  `--toast-viewport-offset-top` stays yours and adds to that. Bottom positions
  are unchanged.

- f2eac42: Add `Slider`, for picking a number or a range by dragging. `<Slider
  label='Price' defaultValue={[20, 80]} />` renders the label, the value, the
  track and one thumb per value. `format` takes `Intl.NumberFormat` options,
  such as AUD currency, and formats in `en-AU` unless you pass a `locale`.
  Inside `Field` it takes its name, helper or error text, and `invalid` and
  `disabled` from there. The fill is accent, like `Switch` and `Checkbox`, and
  turns danger when invalid. `size` (`sm`, `md`, `lg`) scales the thumb and
  track, each keeping a 44px touch target, and `direction='vertical'` runs it up
  the page. The parts (`Label`, `Value`, `Control`, `Track`, `Indicator`,
  `Thumb`) compose for custom layouts such as tick marks.
- 2be7abc: Add `Switch`, an on or off control for settings that apply straight away. Pass
  `label` and `description` for a labelled settings row, or drop it into `Field`
  and it takes its name, helper or error text, and `invalid`, `required` and
  `disabled` from there. The checked track is accent with a tick, the thumb slides
  with a transition that stops under reduced motion, and `size` is `sm` or `md`.
- e0371c6: A `Tabs.Tab` that holds only an icon is now a circle at every size and
  emphasis, with the icon centred and the indicator matching it. It warns in
  development when it has no `aria-label` or `aria-labelledby`.
- 47c7147: Add `Toast`, a brief message that confirms an action or reports its result.
  Mount `Toast.Provider` with a `Toast.Viewport` once at the app root, then call
  `useToastManager().add({ title, description, intent, actionProps })` from any
  component, or `createToastManager()` from outside React. `intent` (`success`,
  `danger`, `warning` or `info`) colours the toast and leads it with a matching
  icon, `actionProps` adds a small button such as Undo or Retry, and `promise`
  shows a spinner until the work settles. A thin `Toast.Progress` bar along the
  bottom of timed toasts shows how long they have left, pausing whenever their
  timer pauses (hover, focus, a background window). `Toast.Viewport` takes a `position`
  (`bottom-end` by default, `bottom-center`, `top-end` or `top-center`); small
  screens always span the chosen edge. Set `--toast-viewport-offset-bottom` (or
  `-top`) to clear fixed UI such as a checkout bar. Toasts fan out on hover or
  focus and swipe away towards their edge. Core adds the `motion-toast` utility
  that stacks and animates them from either edge: toasts enter, restack and
  snap back on a spring and leave quickly. Core also adds `--ease-spring-lively`,
  a spring with a visible bounce (about 9% overshoot) for transforms that should
  catch the eye.

  The `@base-ui/react` peer range rises to `^1.8.0`. Toast relies on 1.8 for
  `update(id, previous => …)` and for timers that keep their remaining time
  across repeated pauses, which the progress bar follows.

- 3cd9e12: Add `Toggle` and `ToggleGroup`. `Toggle` is a pressed or unpressed button that
  takes Button's sizes and steps up one emphasis when pressed; with only an icon
  inside it renders square. `ToggleGroup` is a segmented control with a pill that
  slides to the pressed item. `emphasis` follows Toggle: `normal` (the
  default) has a bordered track and `subtle` a tinted one, each with a solid pill,
  and `subtler` has no track and a tinted pill. It is single select by default and
  never ends up empty, takes `multiple` for independent toggles, and has `size`
  (matching Button heights), `direction` and `disabled`.

### Patch Changes

- b67cf46: `ThemeProvider`, `getAccentStyleSync` and the cart drawer's accent theming cap
  the accent's chroma to what sRGB can show at step 9, through
  `getAccentChromaSync` from `@oztix/roadie-core/colors`. A saturated green or
  cyan accent no longer renders its strong fill too light for white text.
- 3ef4a98: Raise the `@base-ui/react` peer range from `^1.0.0` to `^1.6.0`. Roadie
  already needed 1.6: `Drawer`, the `InputGroup` parts of `Combobox` and
  `Autocomplete`, and `Select.Label` don't exist before 1.3, and `Navigator`
  menus and tooltips fail their tests before 1.6. If you pin `@base-ui/react`
  below 1.6, upgrade it along with this release.
- b270fa6: Select, Combobox and Autocomplete options no longer stay filled after a tap on a
  touch screen when the list stays open, such as a multiple select. A highlight
  the pointer made only fills where the pointer can hover, and a keyboard
  highlight still shows everywhere.

  Switch, Checkbox, CheckboxGroup, RadioGroup, Select, NumberField and OTPField
  now point `aria-describedby` at the text `Field` actually renders. A control
  marked `invalid` inside a valid `Field` pointed at an error text that was never
  rendered, so screen readers lost the helper text.

  `Select.Value` now shows the selected item's label instead of its raw value, on
  the server and first render too. Select reads each `Select.Item`'s text (its
  string children or its `Select.ItemText`), and an `items` or
  `itemToStringLabel` you pass still wins. Values of a multiple select show as
  their labels.

- 7e4c780: Select and Combobox now type `multiple`. The roots are generic over the value
  and `multiple`, like Base UI's, so `<Select multiple>` takes an array for
  `value` and `defaultValue` and hands one to `onValueChange`. A single select
  infers its value type from `value` or `defaultValue` instead of `unknown`.
  `SelectProps` and `ComboboxProps` take the same optional type parameters for
  wrappers.

  A Select trigger no longer grows past its container. A long label truncates
  with the icon kept in view, and a multiple select shows the labels that fit
  then counts the rest, such as "Bee Gees, Custard +2". Screen readers still hear
  every label.

- e0371c6: Make the selected item of a `subtler` `Toggle` or `ToggleGroup` easier to see.
  A pressed `subtler` toggle or group item now takes a soft fill with no border
  and a strong icon or label. The fill alone stays under 3:1 against the
  surface, so the fill and the icon carry the state together: use `subtler` for
  quiet controls, and `subtle` or `normal` when the state must stand out. On the
  unpressed side, a `subtler` `Toggle` now rests in subtle text rather than
  normal text, like the items of a group. Core adds the `is-selected` utility
  that carries this look, with a system highlight edge under forced colours.
  The `subtler` `Tabs` underline keeps its look and now takes the highlight
  colour under forced colours, where it used to disappear. The chart card's
  Chart and Table switch moves up to `md`, so each item is 32px, the size of the
  card's More button.
- Updated dependencies [97854ae]
- Updated dependencies [200dbed]
- Updated dependencies [b4ca530]
- Updated dependencies [e0371c6]
- Updated dependencies [6ec114f]
- Updated dependencies [b67cf46]
- Updated dependencies [e0371c6]
- Updated dependencies [47c7147]
- Updated dependencies [f898797]
  - @oztix/roadie-core@2.10.0

## 2.14.0

### Minor Changes

- dba660b: `Card.Footer` reads `--card-footer-size` when it's a side column, with
  `direction='horizontal'` or a split `direction='auto'`. Set it once on a list
  so every card's side column, and a ticket's perforation along it, lines up
  whatever each footer holds. It's a minimum, so a wider footer still grows
  rather than overflowing, and a stacked footer ignores it.
- dba660b: Add `Card.Link`, the card's main link, for a card that also holds other
  actions. Wrap the title in it. It covers the card, so a click anywhere follows
  it, while other links and buttons in the card stay clickable above it. The card
  takes its hover, press and focus states from the link, for plain and ticket
  cards and every emphasis, so apps no longer restate them. Screen readers hear a
  short link named by its own text rather than the whole card. It routes `href`
  like every other Roadie link.

  On a ticket card in a browser without `corner-shape` (Firefox today), the
  footer's plain text doesn't follow the link; its own links still work.

- 7b36ba3: Add `variant='ticket'` to `Card`. It cuts a real notch into each side where the
  body meets `Card.Footer`, with a perforated line between them, and works with
  every emphasis.

  Add `direction` to `Card`. It lays out any card's parts: `vertical` (the
  default) stacks them, `horizontal` gives `Card.Footer` a column of its own
  beside the rest of the card, and `auto` stacks below 30rem and splits into two
  columns at or above it. On a ticket, the notches and the perforation follow
  whichever layout is in effect.

- dba660b: A `Drawer.Close` inside `Drawer.Header` now takes the top-left corner above
  the title, as far from the top edge as from the side, wherever it's written.
  Render it as a `normal` `IconButton` named "Close". The Drawer docs gain
  guidelines for naming a drawer, placing Close, when a drawer needs one, and
  keeping a second Close out of the footer.
- dba660b: Top and bottom drawers now run edge to edge on a phone and, from `sm` up, stop
  at `max-w-xl`, centred, floating `--spacing(2)` off their edge with every
  corner rounded: the same shape as the cart drawer. Remove any width, margin or
  radius classes an app added to get this.

  Every drawer now rounds at `rounded-4xl`, the new Sheet tier on the Shape
  foundation, whichever side it comes from. The edge it's attached to stays
  square.

  `Drawer.Body` now scrolls in `ScrollArea`, so drawers use Roadie's scrollbar.
  It is still Base UI's drawer content, so a drag in a scrolled body scrolls it
  rather than dismissing. A `className` on it still styles the content, as
  before.

  Core's `motion-drawer` reads `--drawer-float`, so a surface held off its edge
  slides fully clear.

- dba660b: `Drawer` sizes on the top and bottom are now fixed heights, so a sheet holds
  still while its content changes. Each is a share of the space the drawer can
  use. That space leaves out the far edge's safe area and a gap, like an iOS
  large sheet, and in a wider window the float off the near edge. `sm` is half
  of it, `md` three quarters and `lg` all of it. The new `fit` size follows the
  content up to all of it, and is the default for top and bottom drawers. Side
  drawers keep `md` as their default, and `fit` there sizes to the content's
  width up to the `lg` width. Remove any `h-*` class an app added to hold a
  drawer's height.
- dba660b: Add `emphasis` to `Drawer` and `Dialog`: how much the overlay takes over the
  page behind it. `normal` dims and blurs the page, `subtle` tints it and leaves
  it readable, and `subtler` leaves it clear while a click outside still
  dismisses. A small (`size='sm'`) top or bottom drawer defaults to `subtle`,
  because it peeks over its page; every other drawer and every dialog defaults
  to `normal`.

  Core adds `emphasis-overlay-subtle`, and `emphasis-overlay` now drops its blur
  under `prefers-reduced-transparency` and carries the `-webkit-` prefix.

- dba660b: `Pane.Body` now renders a `<div>` that fills the height the header leaves,
  and takes `className` and the other div props. A band or background on it
  reaches the pane's bottom edge, and a child with `grow` inside a
  `flex flex-col` body does too, so apps no longer need to restyle the pane's
  scroll content. A pane without a `Pane.Body` keeps its content height, as
  before.
- dba660b: An inspector `Pane` now moves its content into a bottom drawer when its column
  yields, so apps no longer write the content twice. Place a
  `Pane.InspectorTrigger` anywhere in the same `Navigator`: it shows only while
  the column has yielded and opens the drawer, which takes its name from the
  inspector's `aria-label` and keeps the page readable behind it.

  `reveal` on the inspector says its content should be seen. While the column
  shows, it already is; once the column has yielded, `reveal` opens the drawer.
  `onRevealChange` reports the trigger opening it and people dismissing it.

  The drawer is a fixed `lg` sheet, so filtering the content can't resize it
  under the user's thumb. `drawerSize` on the inspector picks another Drawer
  size.

  In the drawer, the inspector's own `Pane.Header` shows a Close in its top-left
  corner, 24px from the drawer's top and side, and casts the drawer's scroll
  shadow. Content without a `Pane.Header` gets a header holding just the Close.
  The drawer sets `--pane-surface` to its raised fill, so sticky chrome inside
  it mixes against the right colour.

  `pane-inspector-yielded:` also applies to the inspector's own content once it's
  in the drawer, so content can adapt to where it renders.

- dba660b: Add `size` to an inspector `Pane`: `sm` (14rem, the default), `md` (20rem) or
  `lg` (24rem). Each size has its own thresholds, so the stack's panes keep
  their minimum widths beside it and `pane-inspector-yielded:` flips at the
  right width. Use `size` rather than widening the column with a class, which
  leaves the thresholds assuming 14rem.
- dba660b: Add `measure` to `Pane`: `full` (the default), `narrow` (24rem, for forms),
  `readable` (65ch of the pane's text) or `wide` (56rem). It caps the body and
  the header's title while the header and footer still span the column.
  `measureAlign='start'` holds the capped content to the start instead of
  centring it.
- 7b36ba3: Add `QRCode` for scanning tickets at the gate, from
  `@oztix/roadie-components/qr-code`. It encodes `value` at error correction
  level H and, by default, puts the Oztix mark on a dark 5×5-module tile in the
  centre. Pass `children` to use your own mark, or `branded={false}` for a plain
  code. It's always dark on white, whatever the theme or intent, and has no
  hooks, so it renders in server components.

### Patch Changes

- dba660b: A `Card` with `direction='auto'` is now a container named `card`, so its
  children can use `@min-[30rem]/card:` and know it resolves against the card
  rather than a container further up.
- dba660b: `Drawer.Handle` now uses the divider colour, so it shows on the drawer's
  floating surface in light and dark mode. It used the sunken fill, which sat a
  single step off the surface in light mode and read as missing.
- dba660b: `Drawer.Header` and `Drawer.Footer` cast a shadow over the body while it
  scrolls beneath them, so a long list reads as passing under the header and
  footer rather than being cut off. Each shadow fades out when there's nothing
  left to scroll on its side.
- dba660b: On the phone tab bar with a pinned item, the tabs now start at the leading
  edge instead of centring, and both the tabs and the pinned circle sit 1rem in
  from the edges, where the circles land when the bar collapses on scroll.
- Updated dependencies [dba660b]
- Updated dependencies [dba660b]
- Updated dependencies [dba660b]
  - @oztix/roadie-core@2.9.0

## 2.13.0

### Minor Changes

- a234c45: `Accordion` now publishes `--content-inset` (16px) and both its trigger and
  content read it, so content dropped into `Accordion.Content` lines up with the
  trigger without extra padding. Override the variable on the root to change both
  at once. In Safari, an open panel whose content changes size, such as a filtered
  list, now resizes with it instead of clipping.
- 0c826c5: Add `hideLabel` to `Badge`. It shrinks the badge to a dot, sized by `size` and
  painted by `intent` and `emphasis`, and keeps the label visually hidden so
  screen readers still announce it. It implies `indicator`, and `indicatorPulse`
  pulses the dot.
- 65ba926: Add `Drawer`, a surface that slides in from any edge and swipes away, built on
  Base UI's drawer primitive. Core gains the `motion-drawer` utility, which drives
  a drawer's edge transition and tracks Base UI's live swipe offset.
- db10921: Add `List`, the vertical row primitive: a title with optional description,
  leading and trailing slots, a drill-in chevron, grouped sections with titles,
  and `href` rows that route through `RoadieLinkProvider`. A row's description is
  announced as its description rather than as part of its name, the leading and
  trailing slots carry `data-slot`, and `List.GroupTitle` is an `<h2>` whose level
  `render` changes, such as `render={<h3 />}`.
- 857ade4: Add `Logo`, the Oztix logo in a fixed brand colour, with `normal`, `mark` and
  `wordmark` variants. `product` pairs the mark with a product name as live text,
  such as `<Logo product='Studio' />`, and a `size` prop (`xs`–`xl`, default `md`)
  scales the whole logo by its height. The lockup is always left to right, so
  right-to-left pages never mirror it.
- f3990bd: Add `Navigator` and `Pane`, the application frame.

  `Navigator` is one navigation model at every size: floating capsules down the
  side from `md`, with a brand (the Oztix `Logo` by default), pinned items and an
  optional expanded state with labels, and a floating tab bar on phones. An item
  always links to its declared `href`, so tapping a top-level item goes to that
  destination's root wherever you were inside it. Items declare `placement` and
  `visibilityPriority`; whatever doesn't fit folds into a generated More pane. A
  destination's pages open in a generated list pane declared with
  `Navigator.Secondary`, optionally searchable, and an item can own a
  `Navigator.Menu` instead. `Navigator.Primary` must be a direct child of
  `Navigator`. Every other child of `Navigator`, parallel-route slots included,
  renders inside the panes row, so a toaster or banner belongs outside
  `Navigator` or in a `Pane`.

  `Pane` is a scrolling column with sticky chrome, a collapse-on-scroll header
  and a stack position when panes share a screen. A bare `Pane` is a detail
  (`column` defaults to `'detail'`), so give a root pane `column='list'`. `tabBar`
  sets what the phone tab bar does while the pane is top, and `depth` is only for
  a pane rendered out of document order. Roadie derives depth from render order
  otherwise, on the server too. `Navigator` lays panes out as columns from its
  own width (two from 46.25rem, three from 76rem) and stacks them below that. Full
  columns need container style queries, in Chrome 111, Safari 18 and Firefox 151.
  Older browsers get the top pane, with the root beside it from 46.25rem. A
  stacked pane that mounts as the new top slides in like one that was already
  there, so a route-driven detail pane animates on a push; a first
  paint, hydration and reduced motion never slide. A pop moves the pane behind,
  which slides back as the one above it is removed; the pane being left is not
  animated out. Swapping a sibling cuts. A commit that replaces a pane with
  another at the same depth, leaving the stack the shape it was, is not a push.
  Switching top-level item cuts too, whatever stack the incoming route draws. A
  `Navigator.Secondary` with `overview` draws every one of its routes in one
  pane, so a step between its pages has no pane of its own to move. The page
  being left is copied into an inert document and slid away while the arriving
  one comes over it. That copy is the one in the frame, and only an overview
  step makes one. `Pane.Search` is a pill search field with a Cancel.

  `Pane` and `Pane.Body` each hold a Suspense boundary, so a suspension inside a
  pane stops at the pane and its header stays on screen. Either boundary holds the frame's pending indicator
  automatically while it waits, but a transition into a suspending child of the
  same pane keeps the old content on screen instead of showing a fallback, so
  that case reports nothing automatic; `usePendingNavigation`'s `start`/`stop`
  covers it, and `pending` on `Pane` covers a wait Roadie can't see at all, such
  as a fetch without Suspense. A route's `loading.tsx` is optional; it only buys
  Next's partial prefetch. The indicator itself is app-wide, one glow for the
  whole frame. After 150ms with nothing changed yet, it fills with a slowly
  turning gradient of three Oztix colours behind the panes and the nav, and on a
  phone the panes pull back and round their corners to show it. It goes when the
  destination lands, and a navigation faster than 150ms shows nothing.
  `RoadieLinkProvider` marks a plain click on the internal href of any Roadie
  surface that takes one, and takes `pendingIndicator={false}` to turn it off.

  A pane takes its scroll down against the browser's own id for the history entry
  it is on, so going back or forward through history puts every pane where it was.
  Going forward, the pane the navigation arrives at starts at the top and the pane
  it leaves keeps its place. The top of the stack is the deepest reached pane, so
  the pane a route drilled from keeps its scroll. Scroll restoration reads no URL
  and writes no history state. It reads `navigation.currentEntry.key`, and where an engine has no Navigation API panes
  keep starting at the top.

  `Pane.Header` keeps `backHref` as a real routed link, but a plain Back or Close
  click now traverses browser history when the immediately previous
  same-document entry matches its origin, path and query. That preserves the
  parent's mounted state and avoids adding a duplicate parent entry. Direct loads,
  reloads, unrelated history, modified clicks and browsers without the Navigation
  API keep following the canonical link normally.

  Also ships `Navigator.ExpandToggle`, `Navigator.SecondaryPane` and
  `Navigator.SecondaryItems`, with `useNavigatorSecondary` for reading a
  destination's items outside the generated pane. `showList` and `showMore` put
  the list and More in the URL; `expandedFromDocument` pairs with
  `getNavigatorExpandedScript` from `@oztix/roadie-core/navigator`.

- f3990bd: **Peer dependency change: React 19.2 or later is now required.** The `react`
  and `react-dom` peer ranges move from `^19.0.0` to `^19.2.0` in both packages.
  Upgrade React to 19.2 before taking this release. Roadie now uses
  `useEffectEvent`, which first shipped in React 19.2. The widgets' React peer
  stays optional, so Vue-only installs are unaffected.
- dc7588b: Add `ScrollArea`, which gives any bounded region a consistent custom scrollbar.
- 5363c7a: Add `Skeleton`, a placeholder that holds the space content will occupy while it
  loads. One component with a `shape` variant: `text` is a line at the inherited
  line height, `block` is a panel, `circle` is an avatar. Width and height come
  from Tailwind utilities, so a paragraph or a list row is several Skeletons in a
  grid. The root is `aria-hidden` and carries `data-slot='skeleton'`.

  Core adds the `--duration-ambient` (1800ms) and `--duration-sweep` (2400ms)
  tokens, the `--sheen-shade` and `--sheen-highlight` colours, the
  `animate-pulse-subtle` utility, and `animate-shimmer`, which crosses a surface
  with a highlight over that pulse. The highlight is anchored to the viewport, so
  every element wearing the class shares one sweep whatever its size, and it is
  the lighter of the two tones in both themes. Under `prefers-reduced-motion` the
  highlight is dropped and the pulse resolves to a static tint.

- 6fda90c: Add `Tooltip`, a short label that appears beside a control on hover or keyboard
  focus, built on Base UI's tooltip primitive. `Tooltip.Content` takes `side`,
  `align` and `sideOffset` directly, `emphasis` switches between the `strong` chip
  (the default; give `Tooltip.Content` an intent class to colour it) and the
  `floating` popover surface, and `Tooltip.Provider` groups tooltips so moving
  between neighbours is instant.

### Patch Changes

- 4deb856: `Button` and `IconButton` with `href` render a link, not a button: Enter follows it, Space scrolls the page, and `download` is accepted.
- f3990bd: A horizontal `Tabs.List` that outgrows its container now scrolls sideways, with the scrollbar hidden, instead of overflowing the layout, and keeps the active tab in view. The `subtler` emphasis draws its focus ring inside the tab so the scrolling list doesn't clip it.
- Updated dependencies [f3990bd]
- Updated dependencies [f3990bd]
- Updated dependencies [65ba926]
- Updated dependencies [4deb856]
- Updated dependencies [8c2ca73]
- Updated dependencies [5363c7a]
  - @oztix/roadie-core@2.8.0

## 2.12.1

### Patch Changes

- 8c8b666: Refine the shadow scale so raised, floating and sunken surfaces read as
  detailed rather than heavy, and give text fields a cleaner edge.

  Each `shadow-*` level is now a hairline ring for the edge plus a stack of
  layers whose offset and blur double; higher levels add a layer and lower each
  layer's opacity instead of darkening. Light-mode shadows are a shade of the
  intent hue rather than near-black. Inset shadows drop their ring and their
  heavy dark-mode black, and gain a faint lower lip in dark mode so they still
  read as recessed.

  The `shadow-*` and `inset-shadow-*` utilities now follow dark mode and intent
  tinting. Tailwind had been compiling their light values in, so they ignored
  both — only the emphasis presets did. Token and utility names are unchanged.

  New `emphasis-field` preset for text fields: a sunken fill, one translucent
  border that takes the fill's tint, and a single inset line. It is plain CSS, so
  server-rendered markup gets the same look with
  `class="emphasis-field is-interactive-field"`. `Input`, `Textarea`, and the
  `Combobox` and `Autocomplete` input groups use it in place of
  `emphasis-sunken border border-subtle`.

  `is-interactive-field` and `is-interactive-field-group` hover now steps to
  `neutral-3` in light mode — it previously matched the resting fill — and focus
  uses `accent-1` in dark mode so a focused field stays close to its resting
  depth.

  The `Select` trigger drops its solid `border-normal`: the raised shadow's
  hairline now draws its edge, and a solid border beside it read as a double
  outline. Its open state uses the same fill as a focused field.
  While a field state colours its border, `is-interactive-field` switches off
  the raised rim light, which otherwise showed as a white gap inside the border.

- Updated dependencies [8c8b666]
  - @oztix/roadie-core@2.7.0

## 2.12.0

### Minor Changes

- c989b7e: Add a date and time standard: a formatting module and four components.

  `@oztix/roadie-core/datetime` is a new subpath export. It turns an instant into
  text and is the single place dates are spelled. Every call takes an explicit
  `timeZone`, with no browser fallback, because an event time rendered in the
  reader's zone is silently wrong for anyone not standing at the venue.

  `dateStyle` and `timeStyle` are two names for one ladder, `full` / `long` /
  `medium` / `short` / `iso` and `long` / `medium` / `short` / `numeric`, with
  presets for each step. Ranges join with the word `to` rather than a dash, which
  screen readers skip. The meridiem closes up against the digits, so times read
  `7:30pm`.

  Alongside the presets: ranges, durations, countdowns, relative time, and
  machine readable output. `formatMachine` carries the zone's offset so a value
  identifies an instant; `formatIso` deliberately omits it, for export columns
  read as local wall-clock. Instants may be a `Date` or anything carrying
  `epochMilliseconds`, and durations may be milliseconds, an ISO 8601 string, or
  the field object `Temporal.Duration` exposes, so Temporal values work today.

  `DateTime`, `Duration` and `Countdown` are new components. They render a `time`
  element and set its machine readable value, which is the part that is easy to
  get wrong and wrong silently. `CalendarTile` is the exception: it abbreviates
  too hard to be an accessible name, so by default it is an `aria-hidden` `div`
  and the date line beside it owns the `time`. Pass `dateTime` and it becomes one
  itself, which is only right where the tile is the sole date in its region. `Countdown` animates its digits
  with `@number-flow/react`, which components now depends on directly rather than
  asking consumers to install: the root barrel imports it, and a bundler resolves
  every import before it tree shakes, so a peer would break `import { Button }`
  for anyone who had not added it. `CalendarTile` ships a matching `calendar-tile`
  CSS utility for templates that cannot run React.

  **Four visible changes to the shipped cart widget.** Day headers no longer mix
  an abbreviated weekday with a full month, so `Fri, 27 November 2026` becomes
  `Fri 27 Nov 2026`. Time and date ranges join with the word `to` rather than an
  en dash. Seat runs join with a hyphen rather than an en dash, matching how
  number ranges are already written elsewhere, so `A1–4` becomes `A1-4`. And a
  time whose timezone cannot be resolved now renders nothing rather than falling
  back to the browser's own clock, because a plausible time in the wrong zone is
  worse than no time at all.

  Rebuilds the Intermission faces so `tnum` reaches every digit. The digits 1, 4,
  6 and 9 were left proportional, so any column of numbers drifted as values
  changed. The faces are served from new CDN URLs.

### Patch Changes

- Updated dependencies [c989b7e]
  - @oztix/roadie-core@2.6.0

## 2.11.0

### Minor Changes

- 5d05bd1: - **New `Image` component** (`@oztix/roadie-components`) — a size-aware `<img>`
  wrapper. Pass `width` and it requests a right-sized WebP from the Oztix CDN's
  ImageSharp.Web proxy plus a 1x/2x `srcSet`, cutting download bytes and
  decoded-bitmap memory (the Safari-mobile crash class). Non-Oztix URLs, and
  calls without a `width`, pass through as a plain `<img>`. `alt` is required.
  Supports `widths`, `sizes` (when set, builds a responsive small→2x `srcSet`
  ladder so smaller screens download smaller files — fixed-size images without
  `sizes` get 1x/2x), `height` (layout reservation + `aspect-ratio`, and sent to
  the proxy to crop to a fixed box — scaled across the `srcSet`), `priority`
  (eager + `fetchpriority="high"`), `format`, `quality`, `autotrim` (crop
  transparent padding server-side), a `params` escape hatch for any other
  ImageSharp.Web command (`rmode`, `ranchor`, `bgcolor`, …), `placeholder='blur'`
  (blur-up LQIP that fades in on load, auto-derived from the proxy with a
  `blurDataURL` override), `sources` (art direction — a `<picture>` with a
  different URL/crop per breakpoint), and `defer` (IntersectionObserver loading
  for off-screen carousel slides). Every image shows a subtle `bg-subtle` tint as a
  placeholder until it loads, then drops it (override with a semantic background
  utility).
  - **New `@oztix/roadie-core/image` entry point** — pure URL helpers
    `isOztixImageUrl`, `oztixImageAtWidth`, `oztixSrcSet`, and `oztixWidthLadder`
    (the responsive ladder the component uses), plus `OZTIX_IMAGE_HOSTS` /
    `OZTIX_DEVICE_WIDTHS`. For consumers building custom compositions (Vue,
    server-rendered `srcSet`) without the React component.
  - **`Card.Image` is now size-aware** — its inner `<img>` is an `<Image>`, so it
    inherits the full `Image` API (`width`/`height`/`widths`/`sizes`/`quality`/
    `autotrim`/`params`/`placeholder`/`sources`/`priority`/`defer`, the responsive
    ladder, and the `bg-subtle` placeholder).
    - **Behavior change:** card images now default to `loading='lazy'` (and
      `decoding='async'`), where the old bare `<img>` eager-loaded. Mark any
      above-the-fold card image `priority` to restore eager loading and protect
      LCP.
    - **Type narrowing:** `Card.Image` now requires `src` and `alt`, and
      `width`/`height` are `number`-only (previously `string | number` via
      `ImgHTMLAttributes`). Numeric call sites with alt text are unaffected.
  - **`render` on `Mark`, `Prose`, and `Carousel.Title`** — these still exposed the
    legacy polymorphic `as` prop. They now accept the standard Roadie `render`
    escape hatch (e.g. `<Mark render={<h2 />}>`, `<Prose render={<article />}>`,
    `<Carousel.Title render={<h3 />}>`), matching `Card`, `Breadcrumb.Link`, and
    `Carousel.TitleLink`. `as` is now `@deprecated` and will be removed in v3.0.0;
    it keeps working until then.
  - **`Breadcrumb` truncates instead of wrapping** — items no longer wrap. When the
    row runs out of room each item truncates with an ellipsis (`min-w-0` +
    `truncate` on the link/current text), while separators stay put (`shrink-0`).

### Patch Changes

- Updated dependencies [5d05bd1]
  - @oztix/roadie-core@2.5.0

## 2.10.0

### Minor Changes

- ba6b822: - **New `@oztix/roadie-components/css`** — a Tailwind source-registration entry.
  Tailwind v4 ignores `node_modules`, so consumers previously hand-wrote
  `@source "../../node_modules/@oztix/roadie-components/dist"` (brittle when
  `globals.css` moves). Now `@import '@oztix/roadie-components/css'` — the package
  ships its own `@source` relative to itself. Each package's CSS registers only
  its own classes, so import every Roadie package you use.
  - **`Separator` hairline fix** — it now renders a true 1px line. The base
    `border` applied width to all four sides, so with `h-px` the top and bottom
    both painted (~2px). Colour/style now live in the base and each orientation
    sets a single-side width (`border-t` / `border-l`).

### Patch Changes

- Updated dependencies [5e3b922]
  - @oztix/roadie-core@2.4.0

## 2.9.1

### Patch Changes

- 635f07e: `Separator` now renders a true 1px hairline. The base `border` applied a width
  to all four sides, so with `h-px` the top and bottom borders both painted and
  read as ~2px. The colour and style now live in the base and each orientation
  sets a single-side width (`border-t` / `border-l`).

## 2.9.0

### Minor Changes

- 0ba959a: Add a `z-alert` layering tier and let `Dialog` pick its z-index from the ARIA `role`.
  - **core**: new `--z-index-alert` (80) tier above `tooltip`, for blocking alert dialogs that must stack over an open modal or drawer.
  - **components**: `Dialog.Root` accepts `role='dialog' | 'alertdialog'` (default `dialog`). `alertdialog` sets `role="alertdialog"` on the surface and raises the backdrop + surface to `z-alert`.
  - **widgets**: cart-drawer expiry modal uses `role='alertdialog'`; cart-drawer layering migrated to named z-index tiers and footer shadow tinted via `--intent-hue`.

### Patch Changes

- Updated dependencies [82ae89b]
- Updated dependencies [0ba959a]
  - @oztix/roadie-core@2.3.0

## 2.8.0

### Minor Changes

- d4d2e20: Add **EmptyState** — a compound component for empty/zero states that scales
  from a small empty section to a whole-page empty/404 screen via a single
  `size` token (sm/md/lg).

  Sub-components: `EmptyState.IconTile` (Phosphor icon in a tinted circle),
  `EmptyState.Illustration` (SpotIllustration or custom hero), `EmptyState.Title`
  (size-scaled, heading level overridable via `render`), `EmptyState.Description`,
  and `EmptyState.Actions`. Size flows through context, so each slot scales
  itself; the recommended media pairing is sm→IconTile, md→SpotIllustration,
  lg→hero. The root takes an optional `intent` prop (no default — omit to
  inherit the palette from an ancestor), so the IconTile and Buttons inside
  share one colour context. Available from the barrel and the
  `@oztix/roadie-components/empty-state` subpath.

## 2.7.0

### Minor Changes

- 2a43e97: Add Dialog, Popover, and IconTile components.
  - **Dialog** / **Popover** — `@base-ui/react` compounds with `*.Content` shortcuts, `Header`/`Body`/`Footer`, and an `intent` variant on the popup. Dialog adds `sm`/`md`/`lg` sizes; Popover adds `Arrow`, `positionerProps` placement, and `openOnHover`.
  - **IconTile** — a tile that frames a single Phosphor icon, with `xs`–`3xl` sizes, `intent`/`emphasis` variants, and `square` (default) / `circle` shapes.
  - **core**: new `layering.css` z-index scale emitting named utilities (`z-overlay`, `z-modal`, `z-popover`, …), reusable `motion-scale` / `motion-slide` enter/exit utilities in `motion.css`, and a `--rim-light-edge` token in `elevation.css`.

### Patch Changes

- Updated dependencies [2a43e97]
  - @oztix/roadie-core@2.2.0

## 2.6.0

### Minor Changes

- 1aaac77: Smart `href` routing across every link-bearing component, plus
  `RoadieLinkProvider` for app-level Link injection. `LinkButton` /
  `LinkIconButton` are now soft-deprecated.

  ## What's new
  - **`RoadieLinkProvider`** — a single context-injected provider that
    supplies the consumer's Link component (typically `next/link`) to
    every Roadie surface that accepts `href`. Wire it once at the app
    root, and internal links route through your client router
    automatically. Apps without a provider fall back to plain `<a>`.

    ```tsx
    import NextLink from 'next/link'

    import { RoadieLinkProvider, ThemeProvider } from '@oztix/roadie-components'

    ;<RoadieLinkProvider Link={NextLink}>
      <ThemeProvider>{children}</ThemeProvider>
    </RoadieLinkProvider>
    ```

  - **`href` on every link-bearing component** — `Button`, `IconButton`,
    `Card`, `Breadcrumb.Link`, `Carousel.TitleLink`, and `Tabs.Tab` now
    accept `href`. Internal hrefs route through the configured Link;
    external hrefs (`http(s)://`, `//…`) auto-render
    `<a target='_blank' rel='noopener noreferrer'>`; `mailto:` / `tel:` /
    `sms:` render plain `<a>` with no target. Override via `external`,
    `target`, or `rel`.

    ```tsx
    <Button href='/events/123'>View event</Button>
    <Button href='https://stripe.com/docs'>Stripe docs</Button>
    <Card href='/event/123'>{/* whole-card link, with is-interactive */}</Card>
    <Breadcrumb.Link href='/events'>Events</Breadcrumb.Link>
    <Tabs.Tab value='events' href='/events'>Events</Tabs.Tab>
    ```

  - **`IconButton` size DX** — accepts plain `'xs' | 'sm' | 'md' | 'lg'`
    and maps to the underlying `btn-icon-*` classes. Default flips from
    `'icon-md'` to `'md'`. Legacy `'icon-*'` literals still accepted via
    a `@deprecated` alias.

  ## What's deprecated (still works, removed in v3.0.0)
  - **`LinkButton` / `LinkIconButton`** — JSDoc `@deprecated`. They keep
    their public type signatures (including the `<T extends ElementType>`
    generic and the `as` prop) and their original anchor-with-button-
    classes rendering. New code should use `<Button href={…}>` and
    `<IconButton href={…}>` instead.
  - **`'icon-*'` size literals on `IconButton` / `LinkIconButton`** —
    use `'xs' | 'sm' | 'md' | 'lg'` instead.
  - **`as` prop on `Card` / `Breadcrumb.Link` / `Carousel.TitleLink`** —
    unified on `render` as the universal escape hatch. Every Roadie
    component now accepts the same `render` prop (element / component /
    function form), mirroring Base UI's contract. Non-Base-UI components
    compose a small `useRender` helper internally to deliver the same
    semantics. The `as` prop continues to work for back-compat.

    ```tsx
    // Before
    <Card as='button' onClick={handleSelect}>…</Card>
    <Card as={MyLink} href='/x'>…</Card>

    // After
    <Card render={<button type='button' onClick={handleSelect} />}>…</Card>
    <Card render={<MyLink href='/x' />}>…</Card>
    ```

  ## Notes for consumers
  - Existing `<Button onClick={…}>`, `<Button render={<a>}>`, and
    `<Card as='a' href=…>` call sites are untouched.
  - Passing both `href` and an explicit `render` to Button emits a
    one-shot dev-mode warning — `render` wins, provider routing is
    silently disabled. Pick one.
  - `as` always wins over `href` smart-routing for non-Base-UI
    components (Card, Breadcrumb.Link, Carousel.TitleLink). It's the
    documented escape hatch.
  - Server-safe components (Card, Breadcrumb.Link) stay server-safe —
    the smart-href delegation crosses to the client only when `href` is
    set, via Next's standard module-graph boundary.

  ## Where to read more
  - Full plan: `docs/plans/2026-04-28-001-feat-roadie-link-provider-and-tracking-pattern-plan.md`
  - Foundations / Linking docs page (forthcoming)

## 2.5.0

### Minor Changes

- 26cf350: Add `Tabs` compound built on Base UI Tabs. Four `emphasis` presets (`strong`,
  `normal`, `subtle`, `subtler`) share a single animated `<Tabs.Indicator>`
  whose geometry follows the active tab via Base UI's `--active-tab-*` CSS
  variables, with `prefers-reduced-motion` honoured. Roadie's `direction`
  prop renames Base UI's `orientation`; vertical mode left-aligns tab content
  and swaps the `subtler` underline onto the left edge. Per-file leaves with
  a server-safe `index.tsx` keep the compound RSC-safe via both the new
  `@oztix/roadie-components/tabs` subpath and the root barrel.

## 2.4.0

### Minor Changes

- 225ce2c: **Theming API improvements — controlled accent, validation, and pre-hydration bootstrap**

  Add a new declarative theming surface on `ThemeProvider` plus the pieces
  needed to eliminate the "flash of default accent" on static-export apps.

  **New exports from `@oztix/roadie-components`:**
  - `DEFAULT_ACCENT_COLOR` — the Oztix blue default, previously
    module-local.
  - `InvalidColorError` / `isValidHexColor` — validation primitives.
    Consumers can guard untrusted hex at the fetch boundary instead of
    reinventing a zod schema.
  - `getAccentStyleTagSync(hex)` — synchronous sibling of
    `getAccentStyleTag`. Returns a full `<style>` tag with
    `--accent-hue` and `--accent-chroma`, ready for framework-agnostic
    `<head>` injection. Uses the new sync sRGB→OKLCH converter in core.
  - `getAccentStyleSync(hex)` — returns just the inner CSS body
    (`:root{--accent-hue:...;--accent-chroma:...}`), for React consumers
    that want to wrap it in a real `<style>` element via
    `dangerouslySetInnerHTML`.
  - `getBootstrapScript(opts)` — re-exported from `@oztix/roadie-core`.
    Composes `getThemeScript` + an optional accent style tag into one
    head injection for apps that want to do the whole bootstrap in one
    line.

  **Controlled `accentColor` prop on `ThemeProvider`:**

  ```tsx
  <ThemeProvider accentColor={collection?.themeColour ?? null}>
    {children}
  </ThemeProvider>
  ```

  - Pass `undefined` (or omit the prop) to stay uncontrolled — the old
    `defaultAccentColor`-seeded behaviour is unchanged.
  - Pass a hex string to take control: the prop overrides internal state
    on every render, imperative `setAccentColor` calls become no-ops with
    a dev warning, and there's no effect sync or cleanup to wire up.
  - Pass `null` to opt into controlled mode while falling back to
    `defaultAccentColor` (ideal for `collection?.themeColour ?? null`).
  - Invalid hex input in a controlled prop logs a dev warning and falls
    back to the default — the provider never renders with a broken
    theme.

  **`setAccentColor` now throws synchronously** with `InvalidColorError`
  when the argument isn't a valid hex. Previously the call "succeeded"
  and threw inside the async accent effect with no handler path. If your
  app validates at the boundary (or uses the new `isValidHexColor`
  helper), there's nothing to change.

  **Why this matters.** Consumer apps that theme from async data
  (per-tenant branding, promoter-coloured collection pages, feature
  flags) can now drop their bespoke effect-based accent sync, their
  hex validator, and their hardcoded default constant. The imperative
  API remains for simple cases like in-app colour pickers.

### Patch Changes

- Updated dependencies [225ce2c]
  - @oztix/roadie-core@2.1.0

## 2.3.0

### Minor Changes

- d317bad: Phase 3 of the `2026-04-15-refactor-components-consistency-cleanup-plan`. Every compound in the package is now **RSC-safe by construction**: consumers can render `<Fieldset>`, `<Accordion>`, `<Card>`, `<Carousel>`, `<Combobox>`, `<Select>`, `<Autocomplete>`, `<RadioGroup>`, `<Steps>`, `<Field>`, `<Breadcrumb>` — and dot into their sub-components like `<Accordion.Item>`, `<Select.Trigger>`, `<Carousel.Content>` — from a Next.js server component, via either the root barrel or the new per-compound subpath entries. The minor bump is for the new subpath surface and the new `.Root` alias; the bare-root consumer form (`<Compound>`) is unchanged so **nothing existing breaks**.

  **Zero breaking change.** `Fieldset === Fieldset.Root` (same function reference), and every other compound follows suit. Existing code using bare `<Fieldset>` / `<Card>` / `<Accordion>` works exactly as before. `.Root` is a Base UI-parity alias, not a required migration.

  **New subpath entries.** Every compound ships from its own subpath (`@oztix/roadie-components/fieldset`, `/card`, `/accordion`, `/select`, `/combobox`, `/autocomplete`, `/radio-group`, `/carousel`, `/steps`, `/field`, `/breadcrumb`, …). 24 subpath keys generated into `package.json`'s `exports` block. Subpath form is preferred in Next.js consumers because it scopes the compiler walk to one compound.

  **New: `data-slot` attribute on every rendered DOM element.** Shadcn-style addressable markers — `<Fieldset.Legend>` renders `data-slot="fieldset-legend"`, `<Carousel.NavButton>` renders `data-slot="carousel-nav-button"`. Consumers can target these in CSS, Tailwind variants, visual regression tooling, and tests without depending on internal class names.

  **New sub-component prop-type exports on the barrel.** Breadcrumb, Card, Field, Steps, Autocomplete, Combobox, Select, Carousel, RadioGroup, Fieldset, Accordion all now export their full per-sub-component prop type surface (e.g. `BreadcrumbListProps`, `CardHeaderProps`, `SelectTriggerProps`, `CarouselContentProps`, `StepsItemProps`, etc.) for consumers annotating custom wrappers.

  **Build shape: tsdown `unbundle: true`.** Previously the components package bundled each compound folder into a single dist file; it now emits one dist file per source file, preserving the source directory structure 1:1 under `dist/components/<Compound>/`. Rolldown (tsdown's backend) preserves `'use client'` on per-file outputs natively, so the directive stays exactly where it's marked in source. Each compound's `index.tsx` ships **without** `'use client'` — it's a server-safe property-assignment layer that Next.js can follow through to each leaf at build time. This is the load-bearing change that makes dot-access work across the RSC boundary.

  **11 compounds migrated** (pilot + follow-ups): Fieldset, Accordion, RadioGroup, Breadcrumb, Card, Steps, Field, Select, Autocomplete, Combobox, Carousel. Every compound folder now contains per-file sub-component leaves, a shared `*Context.ts` where needed, `variants.ts` where it has CVA maps, a server-safe `index.tsx` attachment layer, and a test file exercising both `<Compound>` (canonical) and `<Compound.Root>` (alias) forms.

  Full rationale, the three rejected attempts, and the authoring checklist for new compounds are in [`docs/solutions/rsc-patterns/compound-export-namespace.md`](../docs/solutions/rsc-patterns/compound-export-namespace.md) and [`docs/contributing/COMPOUND_PATTERNS.md`](../docs/contributing/COMPOUND_PATTERNS.md).

## 2.2.0

### Minor Changes

- f2eb334: Components consistency cleanup, Phases 1 & 2 of the `2026-04-15-refactor-components-consistency-cleanup-plan`. No runtime behaviour change; the minor bump is for the server-safety improvement plus the removal of three `@deprecated` type aliases.

  **New: server-safe by default.** `Input`, `Textarea`, and `Highlight` no longer emit `'use client'`. Consumers can render them from Next.js server components without forcing a client boundary. Verified on the compiled dist — the entries no longer start with the directive. Existing client-component usage continues to work unchanged.

  **Removed: deprecated type aliases.** The three `@deprecated` aliases left in place by the Pattern A migration (#36) are deleted:
  - `SelectRootProps` → use `SelectProps`
  - `ComboboxRootProps` → use `ComboboxProps`
  - `AutocompleteRootProps` → use `AutocompleteProps`

  Also removed (never re-exported from the package barrel, so not part of the documented surface): `SelectTriggerVariantProps` (misnamed re-export) and the `HighlightChunk` type export (kept as a local type inside `Highlight/index.tsx`).

  **Internal cleanups (no API change):**
  - Every Phosphor import in the components package now uses `@phosphor-icons/react/ssr` (Accordion, Select, Combobox, Autocomplete, Steps; Carousel was already on `/ssr`). One import path now works in both server and client components.
  - `Steps` and `Carousel` `direction` variant entries switched from dead `''` strings to `undefined` so the variant API stays intact without stringly-typed noise.
  - `Highlight`'s redundant `query === ''` clause dropped (already covered by `!query`).
  - `BASE_UI.md` §7 gained a "server-safe by default" authoring rule, and the §11 skeleton template's `Object.assign` form was replaced with direct assignment + a `TODO(Phase 3)` marker pointing at the upcoming `export * as` migration.

## 2.1.1

### Patch Changes

- ba58fd6: Migrate every compound component to Pattern A (named exports + property assignment), matching the Carousel convention. Purely structural — consumer imports and the compound API (`<Select>`, `<Select.Trigger>`, `<Card.Header>`, etc.) are unchanged.

  Affected compounds: Accordion, Autocomplete, Breadcrumb, Card, Combobox, Field, Fieldset, RadioGroup, Select, Steps.

  Under the hood:
  - Root functions renamed from `XRoot` → `X` where applicable (internal names only; these were never exported from the package barrel)
  - Subcomponent `interface X extends Y` prop types converted to `type X = Y & { ... }` for `BreadcrumbSeparatorProps`, `FieldLabelProps`, `FieldHelperTextProps`, `FieldErrorTextProps`, `FieldsetLegendProps`, `FieldsetHelperTextProps`, `FieldsetErrorTextProps`, `RadioGroupLabelProps`, `RadioGroupHelperTextProps`, `RadioGroupErrorTextProps`, `SelectHelperTextProps`, `SelectErrorTextProps`, `SelectContentProps`
  - Root prop types renamed to match convention where previously suffixed with `Root` (`SelectRootProps` → `SelectProps`, `ComboboxRootProps` → `ComboboxProps`, `AutocompleteRootProps` → `AutocompleteProps`, `FieldsetRootProps` → `FieldsetProps`, `FieldRootProps` → `FieldProps`, `RadioGroupRootProps` → `RadioGroupProps`). The old `*RootProps` names remain as `@deprecated` type aliases where they were re-exported from the package barrel (`SelectRootProps`, `ComboboxRootProps`, `AutocompleteRootProps`) for backwards compatibility
  - `LinkButton` / `LinkIconButton`: inlined CVA variant props (`intent`, `emphasis`) as literal unions rather than `VariantProps<typeof buttonVariants>['key']`, which `react-docgen-typescript` couldn't drill into. New exported type aliases: `LinkButtonIntent`, `LinkButtonEmphasis`, `LinkButtonSize`, `LinkIconButtonSize` for consumers who want to annotate their own wrappers

## 2.1.0

### Minor Changes

- 7685819: Add `Carousel` compound component built on Embla v9.

  New parts:
  - `Carousel` root with `direction`, `autoPlay`, `opts`, and `aria-label` props.
  - `Carousel.Header` — responsive three-slot layout (title left, dots
    centered, controls right on desktop; collapses to flex `justify-between`
    on mobile). Children are placed by source order so consumers can drop
    arbitrary nodes into any slot.
  - `Carousel.Title` (`<h2>` with `as` prop for heading level) and
    `Carousel.TitleLink` (anchor with trailing arrow icon and `as` for
    framework router links).
  - `Carousel.Controls` — inline flex row that hides on mobile by default
    (`hidden md:flex`) and hides entirely when there's nothing to scroll
    to. Pass `forceVisible` to keep it rendered.
  - `Carousel.Content` — Embla viewport + container. New `overflow` prop
    with `subtle` (default) / `hidden` / `visible` options. `subtle`
    bleeds slides past the gutter and fades them to the page background
    via `::before` / `::after` gradient overlays.
  - `Carousel.Item` — single slide. Uses Embla's `slidesinview` event to
    drive the `inert` attribute, so every visible slide in a multi-visible
    layout (e.g. `basis-1/3` with 4 cards) stays interactive.
  - `Carousel.Previous` / `Carousel.Next` — nav buttons compose `IconButton`.
    Auto-hide when `canScroll` is false.
  - `Carousel.PlayPause` — play/pause toggle, renders only when `autoPlay`
    is set.
  - `Carousel.Dots` — one button per _Embla snap_ (not per slide), so
    multi-visible layouts get the correct dot count. Also auto-hides when
    there's nothing to scroll.
  - `useCarousel()` hook returns `{ state, actions }`. `useCarouselUnsafeEmbla()`
    is the explicit escape hatch for consumers that need the raw Embla
    `api` — named separately so raw-Embla coupling is greppable.

  Behaviour notes:
  - `align: 'start'` is the Roadie default in `resolvedOpts` (consumers can
    still override via `opts`).
  - Embla's `snapList()` feeds a `snapCount` state that powers all
    navigation logic, so `canGoToPrev` / `canGoToNext` / `canScroll` /
    `Carousel.Dots` all work correctly for multi-visible layouts.
  - Keyboard nav (`ArrowLeft`/`Right`, `ArrowUp`/`Down` in vertical mode,
    `Home` / `End`) on the viewport; arrow keys yield to focusable
    content inside slides.
  - `prefers-reduced-motion: reduce` disables the autoplay plugin
    entirely and sets Embla's `duration` to 0 for instant transitions.
  - WCAG 2.2.2-compliant pause model: `Carousel.PlayPause` is a sticky
    toggle; hover / focus pause the plugin transiently without retriggering
    the live region.
  - `safePluginCall` warns in dev when Embla's autoplay plugin throws
    instead of silently swallowing the error.

## 2.0.2

### Patch Changes

- 4f929b8: Migrate build pipeline from tsup to tsdown (Rolldown). Internal build-tool
  change with no consumer-facing API differences — dist shape, exports map,
  and type declarations are unchanged.
  - Rolldown preserves `"use client"` directives on entries natively, so the
    post-build hook that previously re-inserted them is gone.
  - `build:css` now invokes the `tailwindcss` bin directly instead of
    `npx @tailwindcss/cli`, eliminating stray npm warnings during builds.
  - Adds `RefAttributes` to `RadioGroup.Root` and `RadioGroup.Item` prop
    types so they match the Select/Combobox/Autocomplete convention.
  - Adds `docs/contributing/BASE_UI.md` as the canonical authoring guide
    for new Base UI wrappers.

- Updated dependencies [4f929b8]
  - @oztix/roadie-core@2.0.1

## 2.0.1

### Patch Changes

- d4f9539: Fix .d.ts type resolution for pnpm consumers. Use named prop types with type aliases instead of ComponentProps, add RefAttributes for ref forwarding, and move @base-ui/react and class-variance-authority to peer dependencies so consumers can resolve exported types. Adds attw and check:dts build guards to prevent regressions.

## 2.0.0

### Major Changes

- 0645262: Migrate design system from PandaCSS to Tailwind CSS v4 + Base UI

  **Breaking changes:**
  - Replace PandaCSS with Tailwind CSS v4 — all `css()`, `styled()`, `sva()`, and `cva()` (PandaCSS) APIs removed
  - Replace Ark UI with Base UI for interactive component primitives
  - Remove `View`, `Container`, `Text`, and `Heading` components — use raw HTML elements with utility classes
  - Remove `useAccent()` hook — replaced by `useTheme()`
  - Remove `useColorMode()` hook — replaced by `useTheme()` with `isDark`/`setDark`
  - Rename `colorPalette` prop to `intent` (`information` -> `info`, `primary` -> `brand`)
  - Rename `appearance` prop to `emphasis` across all components
  - Rename emphasis level `default` to `normal` (scale: strong -> normal -> subtle -> subtler)
  - Components no longer set a default intent — they inherit from CSS cascade context
  - Default Tailwind color utilities disabled (`--color-*: initial`) — use semantic colors (`bg-normal`, `text-subtle`, `border-normal`)
  - `getAccentStyleTag()` is now async (lazy-loads colorjs.io)
  - Dark mode changed from `data-color-mode="dark"` to `className="dark"` with CSS `color-scheme`
  - Icons migrated from Lucide to Phosphor (`@phosphor-icons/react`, `weight="bold"`)

  **New features:**
  - CSS-native OKLCH color system with 7 intents x 14-step scales
  - Intent/emphasis/semantic-color utility system via Tailwind `@utility` directives
  - Intent-tinted elevation shadows and rim-light scale
  - Fluid typography via `clamp()` for text-lg and above
  - Motion tokens (duration, easing, keyframes) with `prefers-reduced-motion` reset
  - `is-interactive` and `is-interactive-field` interaction utilities
  - Flash-free dark mode SSR via `getThemeScript()`
  - 19 new components: Prose, Badge, Card, Input, Textarea, Field, Label, Select, Combobox, Autocomplete, RadioGroup, Fieldset, Accordion, Breadcrumb, Separator, Steps, LinkButton, Indicator, Marquee
  - Field as universal form control wrapper with context inheritance
  - Sub-component API pattern for Select and Combobox
  - ThemeProvider with `followSystem`, `defaultDark`, `setDark`, localStorage persistence
  - Vue integration support (tokens + utility classes only)

### Patch Changes

- Updated dependencies [0645262]
  - @oztix/roadie-core@2.0.0

## 1.2.0

### Minor Changes

- d9a0534: Add essential components and design tokens for B2B website development (INNO-170)

  **New Components:**
  - Add Container component for responsive page-level layouts with max-width constraints
  - Add IconButton component for square, icon-only button variant
  - Add Mark component for semantic text highlighting with theme-aware styling
  - Add Highlight component for intelligent search result highlighting using Ark UI
  - Add SpotIllustration system with automated SVG-to-component pipeline and 12 initial illustrations

  **Design Token Enhancements:**
  - Add `brandSecondary` color palette to type system
  - Add `surface.highlight` tokens for all color palettes with hover/active states
  - Update `surface.strong` token colors for improved contrast

  **Font System:**
  - Rename from Inter Variable to Intermission (Oztix's customized version)
  - Enable OpenType features: case, ss03, cv01-cv05, cv08-cv11
  - Subset to Basic Latin (U+0020-007F) and typographic quotes (U+2018-201F) for optimized file size

  **Build System:**
  - Add automated SpotIllustration build pipeline with SVGO optimization and watch mode
  - Add chokidar and svgo dependencies for illustration tooling
  - Add tree-shakeable exports for spot illustrations

### Patch Changes

- Updated dependencies [d9a0534]
  - @oztix/roadie-core@1.2.0

## 1.1.0

### Minor Changes

- 6e05fb8: Add color mode utilities and improve design tokens

  **New Features:**
  - Add vanilla JavaScript `colorMode` utilities for framework-agnostic color mode management
  - Export `useColorMode` hook separately from components for better tree-shaking
  - Add CSS custom properties and utilities for color mode tokens

  **Token Improvements:**
  - Align brand color names with lighting metaphor system (luminary, beacon, radiance, brilliance, spark)
  - Normalize all hex color codes to lowercase for consistency
  - Adjust semantic token `surface.strong` mappings for better contrast
  - Fix `Heading` component default `colorPalette` to use `neutral`

  **Developer Experience:**
  - Improve generated CSS token formatting to match Prettier rules
  - Optimize PandaCSS codegen to eliminate duplicate type generation
  - Add TypeScript incremental compilation support for faster builds

  **Documentation:**
  - Update docs to demonstrate color mode utilities usage
  - Add vanilla CSS tokens documentation and examples
  - Improve code preview component styling

### Patch Changes

- Updated dependencies [6e05fb8]
  - @oztix/roadie-core@1.1.0

## 1.0.0

### Major Changes

- 8481943: Upgrade to PandaCSS 1.4.3 and Ark UI with modernized component system

  **Breaking Changes:**
  - Upgraded PandaCSS from 0.48.1 to 1.4.3
  - Migrated from React Aria Components to Ark UI factory pattern
  - Button component now uses native HTML props: `disabled` instead of `isDisabled`, `onClick` instead of `onPress`
  - Removed `colors.solid.*` tokens (use `surface.strong` instead)
  - Renamed all `muted` emphasis levels to `subtler` (e.g., `fg.muted` → `fg.subtler`)
  - Changed primary font from Inter Variable to Intermission
  - Refined letter spacing token scale (values changed significantly)
  - Complete rewrite of Text, Heading, Button, and Code components to use Ark UI factory
  - New styled() API for components replacing previous implementation
  - Simplified View component implementation
  - Component props standardized across all components

  **New Features:**
  - All components now support `colorPalette` prop for flexible theming
  - Button component rewritten with `styled()` API and new `xs` size variant
  - Components modernized to use semantic `colorPalette.*` tokens
  - New standardized component API with consistent props across all components
  - Enhanced typings with HTMLStyledProps for comprehensive prop support
  - Updated Text, Heading, Button, and Code components with consistent styling system
  - View is now a PandaCSS pattern component
  - Improved recipe system with shared patterns and consistent APIs

  **Migration:**

  Update Button props:

  ```diff
  - <Button isDisabled onPress={handlePress}>
  + <Button disabled onClick={handlePress}>
  ```

  Replace removed tokens:

  ```diff
  - color: {colors.accent.solid.default}
  + color: {colors.accent.surface.strong}
  ```

  Update emphasis levels:

  ```diff
  - <Text emphasis="muted">
  + <Text emphasis="subtler">
  ```

### Patch Changes

- 0125940: Added src files to package
- Updated dependencies [8481943]
  - @oztix/roadie-core@1.0.0

## 0.2.1

### Patch Changes

- f2aa279: Update neutral solid colors to work better with default button
- Updated dependencies [f2aa279]
  - @oztix/roadie-core@0.2.1

## 0.2.0

### Minor Changes

- 94d8153: Add new semantic color token system
  - Introduce new color palette structure with semantic tokens
  - Update components to use new color token system
  - Add emphasis and colorPalette props to components
  - Update tests to reflect new token structure

### Patch Changes

- Updated dependencies [94d8153]
  - @oztix/roadie-core@0.2.0

## 0.1.1

### Patch Changes

- 77cd753: Improve build for tree-shaking and code-splitting

## 0.1.0

### Minor Changes

- Initial pre-release of the Roadie Design System for internal testing

### Patch Changes

- Updated dependencies
  - @oztix/roadie-core@0.1.0
