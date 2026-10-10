# @oztix/roadie-charts

## 0.2.0

### Minor Changes

- 99111f3: Dashboards gain a period and a comparison.

  `@oztix/roadie-core/dashboard`: a description can carry `period: { range,
compare?, history? }`, where `range` is a `DateRangeValue`, `compare` a
  `Comparison` or the app's own, any other string such as `'similar'`, and `history` (`'partial'` or `'unavailable'`) what
  `resolveComparison` said about the data. A delta marked `comparison: true`
  follows it. `validateDashboard` checks the period's shape, rejects custom dates
  that aren't real plain dates or run backwards and hour windows (a period covers
  whole days), warns about a comparison with an open-ended range, `history` with
  no comparison, and a comparison delta that sets its own `context`, which never
  shows, and rejects a comparison delta on a dashboard with no period. An app's own
  comparison has no dates, so it counts as no comparison: `validateDashboard`
  warns about a comparison delta or `history` with one, and about one that
  reads like Roadie's, such as `'previous_period'`. `'none'` and `'custom'` are
  rejected. The field's
  type is `DashboardPeriodSpec`.

  `@oztix/roadie-components`: add `DashboardPeriod`
  (`@oztix/roadie-components/dashboard-period`), one `DateRangePicker` button
  with `commit='apply'` that shows the period and the dates it compares with.
  Under the range, a Compare switch turns the comparison on and a toggle group
  picks previous period or previous year, with the dates it covers, or "Not
  enough history" or "Nothing to compare". A custom comparison set by the app
  shows as Custom dates, without a picker. Apply sends both together; Cancel drops both. Its value
  is `DashboardPeriodValue`, `{ range, compare? }`. Its presets default to
  `dashboardPeriodPresets`: next 30 and 90 days, last 30 days, last 12 months
  and this financial year. `dataStart`, `dataEnd` and `alignWeekday` match the
  app's `resolveComparison`, so the comparison shows the dates the app fetches.
  It takes `presets`, `readOnly`, `disabled`, `timeZone`, `today`,
  `weekStart`, `fiscalYearStart` and `locale`, and places `children`, such as a
  channel filter, after the period. On a narrow container they stack. It has one
  size, a large control: 48px tall, with the comparison's dates on a second line,
  so pair it with large Buttons and Selects on the same row.

  `compareOptions` lists the Compare choices in order: `'previous-period'`,
  `'previous-year'`, `'custom'`, which picks the comparison's dates in a
  `DateRangePicker` named "Comparison dates", starting from the previous
  period's, and the app's own as `{ value, label, description? }`
  (`DashboardPeriodCompareOption`). An app's own sets `compare` to its `value`
  and passes it through: it shows its `description` where dates go, and the
  button reads "vs similar venues". `'none'` adds the Compare switch; without
  it nothing turns the comparison off. The default, `['none',
'previous-period', 'previous-year']`, keeps the choices above. A comparison
  the value holds that the list leaves out still shows, by its value if it is
  the app's own. App options valued like Roadie's, and repeats, are left out
  with a development warning. Uncontrolled, the first choice other than
  `'custom'` starts on. The choices wrap onto a second row when they don't
  fit. `DashboardPeriodValue<App>` and
  `DashboardPeriodProps<App>` take the app's values, inferred from
  `compareOptions`. A period that is one of `presets`, fixed dates or relative,
  shows that preset's label with its dates.

  `@oztix/roadie-charts`: `DashboardView` shows a description's `period` above its
  sections. `onPeriodChange` receives the new `{ range, compare? }`
  (`DashboardPeriodValue<string>`, so state handed to it is typed
  `DashboardPeriodValue<string>` too); without it
  the period shows read-only. `periodProps` (`DashboardViewPeriodProps`) passes
  the toolbar's other props. A delta marked `comparison: true` is named on its
  context line ("vs previous period", over any `context` the card gives), hides
  with no comparison or with the app's own, and gives way to "Not enough history" or "Nothing to
  compare" when the period's `history` says so.

- 816a826: `DataTable` links rows with `getRowHref`. The title cell, the pinned text
  column or else the first text column, becomes a link routed through
  `RoadieProvider`, with external links opening in a new tab. Its overlay covers
  the row, so pressing anywhere on it follows the link, and the row takes the
  link's hover tint and focus ring. The link is the row's only tab stop.
  `getRowHref` runs where the table renders, so a server component can pass it.

  `DashboardView` takes `getRowHref={(card, row) => …}` to link table card rows,
  since a dashboard description is JSON and holds no functions.

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

- 7a507d3: The portfolio example dashboard has a period, the past 30 days compared with
  the previous period, so `DashboardView` shows a period toolbar above it. Spread
  the new `portfolioDates` into `periodProps` so the toolbar's dates match the
  data's. `createPortfolioDashboard(period)` works out the sales, gross and
  refund tiles for any period from daily sales (`PortfolioPeriod`), and their
  deltas follow the comparison (`comparison: true`). Gross revenue is now the
  period's, not the shows' lifetime total. The first section is "At a glance",
  and "Sold, last 30 days" is "Tickets sold".
- e3b095a: Each package now ships `roadie.manifest.json`, a machine-readable catalogue for coding agents and tools. Import it from `@oztix/roadie-core/roadie.manifest.json`, `@oztix/roadie-components/roadie.manifest.json`, or `@oztix/roadie-charts/roadie.manifest.json`. It lists every export path with the values and types it exports, every component with its props in the order its source declares them, compound parts, and, where it has them, its docs page and first live example, every deprecated export and prop with its replacement, and, in core, the design tokens. The build generates it from the same source it publishes, so it always matches the installed version.

### Patch Changes

- 9b257cb: A chart with no data now shows an `EmptyState` with an icon: small inside a
  `Chart` card and medium on its own. A chart that can't draw on its own shows a
  danger `EmptyState`; inside a card it still puts the card in its error state.
  A card's plot grows past its height when the state's title wraps. A small
  multiples panel keeps a small text-only state at its own height. The title is
  a paragraph, since a chart can't know the page's heading outline, and the
  `chart-empty` and `chart-error` slots now sit on the `EmptyState` wrapper
  rather than the text. The static SVG renderer keeps its text message.
- e408d69: Keep long category names inside the card on `RankedBars`, horizontal
  `StackedBars` and `Funnel`. The name column takes what the longest name needs,
  up to 40% of the chart's width (never capped below 72px or above 240px, which
  replaces RankedBars' old 180px cap). A longer name wraps to two lines, or one
  when rows are too tight for two, then ends in an ellipsis. On rows too tight for
  one line, names are thinned so none overlap, as the old axis did. Widths are
  estimated wider for capitals, broad glyphs such as M, W and the em dash, and
  CJK. Each label carries its full name in a `<title>`, live and in
  `renderChartSvg`, and the table and summary keep it whole. Names now draw at the
  full label colour rather than the axis's muted one, and RankedBars and Funnel
  bars use the height the axis used to reserve. `renderSmallMultiplesSvg` cuts a
  caption that would run into the next panel the same way.

  Field names now split a one-letter word out of a capital run, so `ticketsADay`
  heads tooltips and tables as "Tickets a day" rather than "Tickets aday".
  Acronyms of two or more capitals keep their case, plural or not: `grossAUD`
  reads "Gross AUD" and `topURLs` reads "Top URLs".

- d72d07b: Example data uses invented venue, event and promoter names from the contributing guide's vetted list, so no example reads as a real Oztix client. Affects the chart examples from `@oztix/roadie-charts/examples` and JSDoc in core records and QueryField.
- 0954968: LineChart's end label for the highlighted series, such as "Forecast 96%" on a pace chart, now uses the subtle text colour instead of `--chart-highlight`, so it meets body text contrast (APCA Lc 75) in light and dark. A dot in `--chart-highlight` sits beside it, so it still reads as the highlighted line's label. When one shows, every end label moves right by 10px to leave room for the dot, and the plot is 10px narrower.
- 5a3da44: The StackedBars examples label September "Sept", the house date format.
- b0e7656: Widgets now ship `@oztix/roadie-widgets/roadie.manifest.json`, with the same shape as the other packages' manifests. It lists every export, including the Vue skins, and describes the React components (`CartDrawer`, `CartExpiryDialogs` and `CartContents`) with their props and docs pages. The Vue skins appear as exports only. Deprecated re-exports, such as `CartExpiryModals` and the `cart-drawer/core` shim, are listed under `deprecations`.

  Every component in the components and charts manifests now has a `docs` link. The spot illustrations, `RoadieProvider`, `RoadieLinkProvider`, `ThemeProvider`, `RequiredIndicator`, `OptionalIndicator`, `LegendKey` and `DashboardView` link the page or section that documents them.

- Updated dependencies [0fe97b2]
- Updated dependencies [ddcad84]
- Updated dependencies [cc39346]
- Updated dependencies [4c9bc5c]
- Updated dependencies [5e9a8bd]
- Updated dependencies [bf0ec67]
- Updated dependencies [54c87b2]
- Updated dependencies [1336d18]
- Updated dependencies [7fe7954]
- Updated dependencies [99111f3]
- Updated dependencies [ff2f04d]
- Updated dependencies [156ca60]
- Updated dependencies [df311de]
- Updated dependencies [c09a86a]
- Updated dependencies [f57dfba]
- Updated dependencies [eb8cb85]
- Updated dependencies [60bebfd]
- Updated dependencies [94c5e81]
- Updated dependencies [d72d07b]
- Updated dependencies [c324014]
- Updated dependencies [8b5de45]
- Updated dependencies [0c67df7]
- Updated dependencies [230a991]
- Updated dependencies [fe925b2]
- Updated dependencies [83e9966]
- Updated dependencies [e3b095a]
- Updated dependencies [a9a6b8a]
- Updated dependencies [ff2f04d]
- Updated dependencies [1ae382b]
- Updated dependencies [fad898f]
  - @oztix/roadie-core@2.11.0

## 0.1.0

### Minor Changes

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

- 200dbed: First release of `@oztix/roadie-charts`: the `Chart` card frame with a Chart
  and Table switch, `ChartLegend`, `ChartTooltip`, texture patterns for forced
  colours and print, and `DashboardView`, which renders a dashboard description
  from `@oztix/roadie-core/dashboard`. Two reference dashboards ship as data from
  `@oztix/roadie-charts/examples`. Plots on TanStack Charts follow in a later
  release.

### Patch Changes

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
