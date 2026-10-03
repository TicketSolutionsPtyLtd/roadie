# @oztix/roadie-components

## 2.16.0

### Minor Changes

- 5a62938: Add `Calendar` (`@oztix/roadie-components/calendar`), a month grid for
  choosing a date, several dates or a range, built on the plain-date math in
  `@oztix/roadie-core/datetime`. Every value is an ISO date string, never a
  `Date`. `mode` is `single`, `multiple` or `range`, with `selected`,
  `defaultSelected` and `onSelect`; a range's `min` and `max` limit its length
  in days. Days that would break them dim, and pressing one keeps the start and
  announces the rule, such as "Ranges can be up to 14 days". `disabled` and `modifiers` take matchers: a date, a list,
  `{ start, end }`, `{ before }`, `{ after }`, `{ dayOfWeek }` or a function.
  Each modifier renders as a data attribute on its days, such as
  `data-has-session`.

  It fills its container: seven columns share the width, each day stays a
  circle up to 48px across in the middle of its column, and a range's band runs
  edge to edge. In a popover it takes 280px a month. It shows `numberOfMonths`
  side by side where they fit and stacked where they don't, or with
  `layout='scroll'` stacks months in a list that scrolls under one pinned row of
  weekdays, adding months as it nears either end. It takes month and year
  selects under `captionLayout='dropdown'`,
  `fixedWeeks`, `showOutsideDays`, `weekStart`, `startMonth` and `endMonth`,
  and a controlled `month`. Focus moves separately from selection with a roving
  tab stop: arrows, Page Up and Down (with Shift for a year), Home and End.
  Disabled days stay focusable, ranges preview under the pointer or keyboard,
  and a polite live region announces the month and the selection. Days carry
  `data-selected`, `data-range-start`, `data-range-middle`, `data-range-end`,
  `data-range-preview`, `data-today`, `data-outside`, `data-disabled`,
  `data-out-of-range` and `data-focused` for styling.

  Today follows midnight in `timeZone` and catches up when a hidden tab is shown
  again. The server leaves today unmarked, so cached HTML read on a later day
  hydrates without a mismatch, and a calendar with no `today`, `month`,
  `defaultMonth` or selection renders an empty frame until the browser knows
  today.

- 0eed3da: `Combobox` gains chip parts for multiple selection: `Combobox.Value`,
  `Combobox.Chips`, `Combobox.Chip` and `Combobox.ChipRemove`, wrapping Base
  UI's, and `Combobox.ChipLabel`, which truncates a long value. Chips are subtle
  pills that inherit the intent around them, with a round remove button.
  Backspace in an empty input removes the last chip, and the arrow keys move
  between chips.

  `Combobox.InputGroup` and `comboboxInputGroupVariants` now set a minimum height
  for each size (`min-h-8`, `min-h-10`, `min-h-12`) instead of a fixed `h-*`, so
  the group grows when chips wrap. A single line keeps its height, but a child
  sized with `h-full` now takes its content's height instead of the group's.

- 99111f3: Dashboards gain a period and a comparison.

  `@oztix/roadie-core/dashboard`: a description can carry `period: { range,
compare?, history? }`, where `range` is a `DateRangeValue`, `compare` a
  `Comparison`, and `history` (`'partial'` or `'unavailable'`) what
  `resolveComparison` said about the data. A delta marked `comparison: true`
  follows it. `validateDashboard` checks the period's shape, rejects custom dates
  that aren't real plain dates or run backwards and hour windows (a period covers
  whole days), warns about a comparison with an open-ended range, `history` with
  no comparison, and a comparison delta that sets its own `context`, which never
  shows, and rejects a comparison delta on a dashboard with no period. The field's
  type is `DashboardPeriodSpec`.

  `@oztix/roadie-components`: add `DashboardPeriod`
  (`@oztix/roadie-components/dashboard-period`), one `DateRangePicker` button
  with `commit='apply'` that shows the period and the dates it compares with.
  Under the range, a Compare switch turns the comparison on and a toggle group
  picks previous period or previous year, with the dates it covers, or "Not
  enough history" or "Nothing to compare". A custom comparison set by the app
  shows as Custom dates. Apply sends both together; Cancel drops both. Its value
  is `DashboardPeriodValue`, `{ range, compare? }`. Its presets default to
  `dashboardPeriodPresets`: next 30 and 90 days, last 30 days, last 12 months
  and this financial year. `dataStart`, `dataEnd` and `alignWeekday` match the
  app's `resolveComparison`, so the comparison shows the dates the app fetches.
  It takes `presets`, `readOnly`, `disabled`, `timeZone`, `today`,
  `weekStart`, `fiscalYearStart` and `locale`, and places `children`, such as a
  benchmark, after the period. On a narrow container they stack. It has one
  size, a large control: 48px tall, with the comparison's dates on a second line,
  so pair it with large Buttons and Selects on the same row.

  `@oztix/roadie-charts`: `DashboardView` shows a description's `period` above its
  sections. `onPeriodChange` receives the new `{ range, compare? }`; without it
  the period shows read-only. `periodProps` (`DashboardViewPeriodProps`) passes
  the toolbar's other props. A delta marked `comparison: true` is named on its
  context line ("vs previous period", over any `context` the card gives), hides
  with no comparison, and gives way to "Not enough history" or "Nothing to
  compare" when the period's `history` says so.

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
  (`@oztix/roadie-components/time-field`) and `DatePicker`
  (`@oztix/roadie-components/date-picker`), typed date and time fields built on
  `Calendar` and the date phrase parser in `@oztix/roadie-core/datetime`.

  `DateField` reads what people type, such as "14 mar", "next fri", "tomorrow"
  or "1/12" (day first), and `TimeField` reads "7:30pm", "19:30" or "noon".
  Text is committed on blur or Enter, then shown in the house style ("Fri 27 Nov
  2026", "7:30pm"). Values are plain strings: an ISO date, `'HH:MM'`, or null.
  Text that names nothing stays on screen, sets `aria-invalid` and makes the
  value null; Escape puts back the last value. `DateField` takes `dateStyle`,
  `today`, `timeZone`, `weekStart` and `disabled` matchers as on `Calendar`, and
  `TimeField` takes `hourCycle` (12 or 24) and `minuteStep`, which the arrow
  keys step by. Both take `size`, `emphasis`, `invalid` and `name`, and inherit
  `invalid`, `required` and `disabled` from `Field`.

  `DateField` and the date in `DatePicker` are comboboxes that suggest dates.
  Focused while empty, they list hints at what can be typed, such as Today,
  Next Fri, In 2 weeks and End of month, each with its date, and nothing is
  highlighted, so Enter still submits the form. As text is typed they offer the
  dates it could mean, with the first highlighted so Enter takes it; Escape
  closes the list and keeps the text, and a second Escape puts back the last
  date. Suggestions are read in `timeZone` and against `today`, and dates that
  `disabled` refuses are left out.

  `DatePicker` pairs a typed date with a calendar in a `Popover`, or below 48rem
  in a bottom `Drawer` titled with the picker's label, whose days grow to fill the
  width up to 48px. Opening it focuses the chosen day or today; choosing a day
  closes it and returns focus to the calendar button. The button is named after
  the picker's label and date, such as "Choose date, Doors (Fri 27 Nov 2026)", and
  the popup "Choose date, Doors". The button is labelled by the `Field` label too,
  so a test that finds the input with `getByLabelText` should use
  `getByRole('combobox', { name })`, and one that finds the button by the exact
  name "Choose date" should match its start.

  `granularity='minute'` adds a `TimeField`, and the value becomes the instant
  the date and time name in `timeZone`, with its offset, such as
  `'2026-11-27T19:30:00+11:00'`, so event times are set on the venue's clock. It
  also takes `disabled` matchers, `readOnly`, `captionLayout`, `startMonth`,
  `endMonth`, `placeholder`, `inputRef`, `form` and a controlled `open`.

  `Field.ErrorText` now also shows a control's own error, such as "Enter a date,
  like 14 Mar or next Fri", when typed text names nothing. It shows even when
  the `Field` isn't `invalid`, and wins over the error text's children until the
  text is fixed.

- 1936d26: Add `DateRangePicker` (`@oztix/roadie-components/date-range-picker`), a button
  showing a date range that opens presets, typed start and end dates, and a range
  `Calendar` in a `Popover`, or below 48rem in a bottom `Drawer`.
  `DateRangePreset` and the default `dateRangePresets` are exported from the
  subpath and the package root.

  The value is a `DateRangeValue` from `@oztix/roadie-core/datetime`. A preset
  is emitted as given, so "Last 30 days" stays relative when saved; typed or
  pressed dates become an absolute `{ start, end }`, and null when both are
  cleared. Nothing is emitted while typed text names no date. The typed Start
  and End are comboboxes that suggest single dates as `DateField` does, never
  ranges, and End suggests nothing before the start. The button shows the range in words with the dates
  a relative range stands for, and is named "Choose dates, <label> (<range>)".

  `presets` replaces the default list (today, yesterday, recent periods and
  periods to date, with the financial year from `fiscalYearStart`), and `group`
  sets presets under a heading. `commit='apply'` holds changes until Apply is
  pressed, for a dashboard period; with `required`, Apply stays off while both
  dates are empty. `granularity='minute'` adds an optional time
  to each end, read in `timeZone`, with `hourCycle` and `minuteStep`. It also
  takes `disabled` matchers, `readOnly` (shown with a lock), `invalid`,
  `required`, `size`, `emphasis`, `placeholder`, `numberOfMonths` (two on wide
  screens, one on narrow), `min`, `max`, `captionLayout`, `startMonth`,
  `endMonth`, `today`, `weekStart`, `locale` and `open`, `defaultOpen` and
  `onOpenChange`, and inherits its label, description, `invalid`, `required`
  and `disabled` from `Field`. The drawer fills the screen's height. Under its title a line sums up the dates
  chosen ("8 Sept to 7 Oct 2026 · 30 days"), and Periods and Calendar tabs
  switch between a list of presets, each with its dates, and Start and End over
  months that scroll under a pinned weekday row. Tapping End or Start picks
  which end the next day sets. With `commit='apply'`, Clear and Apply stay in
  view at its foot, with the header's Close as Cancel.

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
  unless announced.

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
- 58b2703: `Pane` publishes `--pane-sticky-bottom`, the height of its `Pane.Footer`, so
  sticky content at the bottom of a pane can clear the footer. A direct child of
  `Pane.Body` marked `data-pane-fill` takes the height the rest of the body
  leaves; give it its own overflow and it scrolls while the pane stays put.
- 7b8d0da: Add `QueryField` at `@oztix/roadie-components/query-field`: a search field
  that turns what you type into filter chips. It takes your chips and a
  `suggest` function, lists suggestions in the groups you return with a
  "Search for …" row last, and hands what was taken to `onAccept`. Enter searches
  the text unless a suggestion is marked `exact`; filters are taken by arrow or
  click. Locked chips come first with a "Set by this page" tooltip and nothing in
  the field removes them. Backspace on an empty field selects the last chip, then
  removes it. `pendingChip` shows the field being given a value, `onEditChip`
  gives chips an edit button that opens your editor, `shortcut` focuses the field
  from anywhere on the page, and `inputRef` reaches the input. It works alone with
  `aria-label` or inside `Field`; `required` is announced but never blocks a form.
- 85a054f: New `@oztix/roadie-components/records` shows a list of records. `useRecords`
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
  `emptyText` and sorts last.

  In core, `TableColumn` takes `kind: 'status'` and `status`, and
  `validateDashboard` rejects an unknown intent and warns about keys a map lacks.
  `columnStatus(column, key)` resolves a key's intent and label, and
  `cellText(column, value)` gives any cell as the plain text its table shows,
  and `humaniseStatus(key)` gives a key's default label. They come with the
  `STATUS_INTENTS`, `StatusIntent`, `TableStatus` and `ResolvedStatus` types, and
  also from the Zod-free `@oztix/roadie-core/dashboard-layout`. A `status` map on
  a column of another kind gets a warning. `COLUMN_KINDS` gains `'status'`, so an
  exhaustive `switch` over a column's `kind` needs a case for it.

### Patch Changes

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
  `QueryField` is unchanged: Enter still searches the typed text unless you
  arrow to a suggestion or one is marked `exact`.

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

- ff2f04d: A `DataTable` whose rows link keeps its title column visible. The title holds
  each row's only link, so its `priority` is now ignored while rows link, with a
  warning in development, instead of hiding the column and the row links with it.
- 7a507d3: `DateRangePicker` no longer puts `aria-required` on its button, where ARIA
  doesn't allow it: a required picker failed axe's `aria-allowed-attr` check,
  and so did `DashboardPeriod`, which marks its pickers required. A required
  picker now says "Required" in its button's description instead.
- 496217b: A link with `download`, such as `<Button href='/files/lineup.pdf' download>`,
  now renders a plain `<a>` instead of the provider's Link. A file isn't a route,
  and Next.js prefetched it as one and logged a 404. Because the router no longer
  handles it, add any base path to a download `href` yourself.
- eb8cb85: Large pages no longer restyle every element when something small changes.
  Chromium gathers whatever a stylesheet selects after a `:has()` into one set,
  and Navigator and Pane anchor a `:has()` above the whole page, so opening a
  menu, ticking a row, hovering a list row or typing in a search restyled nearly
  every element: up to 3 seconds of style work at 4x CPU on a large docs page.
  Rules that put `*`, a tag or `[data-slot]` after a `:has()` now end on a
  class, a variable or a rare attribute instead: `List` dividers and contained
  rows, the wordmark-only `Navigator.Brand` logo, the iconless `Navigator.Item`
  label, the navigation gutter, the ticket `Card` fill, the disabled `Switch`
  label, `DataTable`'s Show all columns and `is-interactive-within`'s raised
  controls. A test keeps the stylesheet free of the pattern.

  `listItemVariants()` now carries the classes that square a row inside a
  contained `List`, so a custom row built from it still matches `List.Item`.

- d72d07b: Example data uses invented venue, event and promoter names from the contributing guide's vetted list, so no example reads as a real Oztix client. Affects the chart examples from `@oztix/roadie-charts/examples` and JSDoc in core records and QueryField.
- 49b52fe: `Kbd` hints can now stay visible on touch screens inside a container marked
  `data-keyboard-hints='always'`, for a help page about shortcuts or a tablet
  with a keyboard. Elsewhere they still hide where there's no hover.
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
- 58b2703: `Pane.Footer` has a little more room above its content and casts a soft shadow
  up over the body. A `Pane` outside a `Navigator` no longer pads its bottom for a
  phone tab bar that can't be there, so its footer sits at the bottom on phones.
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

  The docs' grouped examples mapped the source groups inside `List`, which never
  filtered. Pass a function to `Autocomplete.List` or `Combobox.List` instead, as
  the examples now do, so groups filter and rank.

- b2c534d: `Switch` renders a native `<button>`, so a bottom `Drawer`'s swipe no longer
  swallows a tap on it, and its label's `for` now points at the switch itself.
- b2c534d: `Autocomplete` and `Combobox` options can be chosen with a tap on an iPhone.
  Base UI cancels an option's `pointerdown` to keep the input focused, and WebKit
  then drops the tap's click, so a tapped suggestion closed the list without
  choosing. Touch and pen now choose an option on lifting, when the finger lifts on
  the option it went down on without moving off it, and the list stays open
  while the finger is down, even if the input blurs as the keyboard goes. The
  mouse events and click that follow the tap don't choose again; a drag or a
  scroll chooses nothing. This also fixes date suggestions in `DateField`, `DatePicker` and
  `DateRangePicker`.

  The date suggestions' Enter hint now shows only for a highlight made by typing
  or the keys. iOS reads a row that grows content under the finger as a hover
  and drops the tap's click, so a tap on a suggestion's empty right side, where
  the hint appeared, didn't choose it.

- Updated dependencies [ddcad84]
- Updated dependencies [54c87b2]
- Updated dependencies [99111f3]
- Updated dependencies [ff2f04d]
- Updated dependencies [df311de]
- Updated dependencies [c09a86a]
- Updated dependencies [f57dfba]
- Updated dependencies [eb8cb85]
- Updated dependencies [d72d07b]
- Updated dependencies [fe925b2]
- Updated dependencies [ff2f04d]
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
