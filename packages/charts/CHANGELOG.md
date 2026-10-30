# @oztix/roadie-charts

## 0.4.0

### Minor Changes

- 8682b82: Add `comparison` to `BarChart` and the dashboard `bar` plot, so daily bars can show last period. Pass `comparison: { y, label? }`, a field on the same rows, and the chart draws it as a quiet bar to the left of each bar, both from zero, and textured apart from the bars in print and under forced colours. A legend names the two bars when there's a comparison value, and the tooltip, the Table view, and the words read out for each bar show the value. Rows that share an x add it up, like the bars. A comparison with no values, or one naming the chart's own `x` or `y`, is left out everywhere, and `validateDashboard` warns on the second.
- 1ddb0e9: Add `decimals` and `trailingZeroDisplay` to every chart with a `format`, as `<LineChart format='percent' decimals={2} />` for `1.27%` sold. They set how values and shares read in the tooltip, value labels, Table view, and screen reader text: a ranked bar's share, a stacked chart's share mode, and a funnel's conversion. A bar chart's `line` takes its own, and `Chart` and dashboard cards pass them to the headline value and its delta. Axis ticks stay short, and values past 10,000 still go compact on the plot.
- 18b7674: Add `other` and `sort` to `RankedBars` and the dashboard `ranked-bars` plot. `other={false}` leaves the bars past `limit` off instead of rolling them into Other, for a label that already says "Top 5 of 40". A highlighted bar past `limit` then takes the place of the last bar that isn't highlighted, so it never drops off. `sort={false}` keeps the data's order, for categories such as age bands. `Scatter` now titles both axes with their field names, so a reader knows what each counts.
- ba2a0a5: Add period comparisons to dashboard charts. A line or bar card whose plot has a `comparison`, small multiples' panels too, now follows the dashboard's period, the way a delta with `comparison: true` does. It's drawn only while the period compares with Roadie's previous period, previous year or custom dates and the history isn't unavailable, and it's named by that comparison, such as "Previous period", or "Custom dates" when the dates are too long for a series label. `cardActions` gets each card as drawn, so a CSV from `cardTable(card)` matches its Table view. The portfolio example dashboard draws its daily sales this way, with the rows lined up by `alignComparison`. `validateDashboard` checks every field a small-multiples panel names, such as its `comparison`, `band`, or `line`, and warns on a line panel with both `comparison` and `series`, as it does for a line card. Like a comparison delta, a plot's `comparison` needs a period on the dashboard, and `validateDashboard` warns when an app's own comparison means it's never drawn.
- d5ff387: Add the dashboard's period to `DashboardView`'s `getRowHref`, as a third argument, so a row link can open the same dates without reading the spec. A custom comparison `DashboardView` can't describe still reads "vs custom dates", and now says why in a development console error.
- 9897cdc: Add `followPeriod(card, period, options)` to `@oztix/roadie-charts/tables`. It returns a dashboard card as `DashboardView` draws it for the period: a line or bar plot's comparison, small multiples' panels too, is dropped unless the period compares with Roadie's previous period, previous year, or custom dates and `history` isn't `unavailable`, and is named after the comparison. Pass the card through it before `cardTable` or `renderChartSvg` on a server, such as a CSV route, so the file matches the Table view. `options` takes the `timeZone` and `locale` the period uses.
- 4775892: Add `comparison` to `LineChart` and the dashboard `line` plot, so a single series can show last period as context. Pass `comparison: { y, label? }`, a field on the same rows, and the chart draws it as a quiet line behind the series, named in the tooltip, the end label, the legend, the Table view, and the words read out for each day. A cumulative line adds it up too. With `series` set the chart leaves it out, and `validateDashboard` warns. A comparison with no values, or one naming the chart's own `x` or `y`, is left out everywhere, and `validateDashboard` warns on the second.
- f962356: Add `renderChartDocument` to `@oztix/roadie-charts/static`, in beta. It draws a chart document from `@oztix/roadie-core/dashboard` as one standalone SVG file, with the label, context and headline value or takeaway above the plot and the source below it, for every plot kind including `static` and `small-multiples`. It validates the document first and throws a `ChartDocumentError` with the problems. `/static` still loads no React.

### Patch Changes

- bd5b821: `Chart` no longer shows `errorAction` when its plot can't be drawn. Loading the data again rarely fixes it, so a Retry there only repeats the failure. The card still shows "This chart couldn't be drawn", and its `actions` stay. An `error` state the app sets still shows `errorAction`.
- ef4073a: Fix three chart gaps found on the prototype's insights dashboards. `StackedBars` keeps an ordered category whose values are all zero or missing, such as an empty age band, as an empty slot and an empty Table row instead of dropping it, says "in every band with data" rather than "in every band" when a band is empty, and draws no legend for a single series. `Heatmap` takes its row and column order from the data, so empty cells at the start no longer reorder the axes, and a row or column with no values draws as an empty band, matching its Table view. An annotation outside a line or stacked area chart's data now warns once in development, in the same words as `validateDashboard`, instead of disappearing silently. `validateDashboard` now warns about a stacked area annotation at a time whose only rows have no value, which the chart drops. It also warns about a small multiples annotation that no panel places, such as one in a gap between panels' dates, which the chart now warns about too.
- 5807ab1: Update `DataCard`'s empty and error states to use `EmptyState`, like the rest of Roadie: an icon tile above the message at every size but `stat`, the error in danger with `errorAction` under its message. The state takes the body's place, at least `bodyHeight` tall, so a card keeps its loading height and an empty stat tile doesn't stretch its row. A chart that can't be drawn now says "This chart couldn't be drawn" in its card, the same message and look it shows before hydration, so a server-rendered dashboard no longer flashes from one error to another. An app's own `state` of loading, empty or error still wins over an earlier draw failure.
- 2e680e2: Reword prop descriptions and code comments without em dashes, so the props tables and editor hints follow the house punctuation. No behaviour changes.
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

## 0.3.0

### Minor Changes

- 05fb8c3: Add `onRangeSelect` to `LineChart`, `BarChart`, and `StackedArea`, so a drag across dated x, or Shift with an arrow key and then Enter, selects a range. It reports an inclusive `AbsoluteRange` in the venue's wall time, such as `{ start: '2026-10-03', end: '2026-10-10' }`, which fits straight into `DateRangePicker` or `onPeriodChange`. Charts without it don't change.
- 574a12a: Add `selectsPeriod` to the `line`, `bar`, and `stacked-area` plots of a dashboard description, so a drag across that card, or Shift with an arrow key and then Enter, sets the dashboard's period. `DashboardView` passes the range to `onPeriodChange` with the current comparison, and `validateDashboard` warns when x isn't dated or there's no period. Dashboards without it don't change.
- 15435ad: Add `groupBy` and `defaultExpanded` to `DataTable`. Rows group by one or more text or status columns, outermost first. Each group gets a row that sums its number columns the way `totals` does, which opens and closes like an Accordion when anywhere on it is pressed, and every level's label sits indented in the title column, or the first column without a sum when there's no text column. Groups start closed: `defaultExpanded` opens them all, or the groups at the paths of values you give. Sorting orders groups by their sums, or by label, at every level. Dashboard `table` cards take the same two fields, `DashboardView` passes them on, and `validateDashboard` checks them.
- b15d667: Add `xFormat` to LineChart and the dashboard `line` plot, with a `daysOut` format for comparing events by days to the event. Ticks read "30d", and tooltips, tables and screen readers say "30 days before" and "Event day". Core adds `XFormat` and `formatX` to `@oztix/roadie-core/dataviz`.
- 7835e36: Add an `eventTime` x format to LineChart and the dashboard `line` plot, for comparing events on their own clock. `x` is hours from midnight starting the first event day, and a day runs to 6am. Ticks read "Day 2" and "19:00", and tooltips, tables and screen readers say "Day 2, 7:15pm". Core exports `END_OF_NIGHT_HOUR` from `@oztix/roadie-core/datetime`, the 6am cutoff that both a late show's night and an `eventTime` day share.
- 764944f: Add `mode`, `today` and `annotations` to StackedArea and the dashboard `stacked-area` plot. `mode='share'` stacks every time to 100%, `today` marks the top of the stack with a dot that reads the total, and annotations work as on LineChart.
- 6483954: Add `StackedArea` (`@oztix/roadie-charts/stacked-area`), a chart for part of a whole over time, such as scans by gate. The largest layer stacks at the bottom, past 6 the smallest roll into Other on top, and the tooltip opens with the total. Dashboards take it as plot kind `stacked-area`, with `/static` and `/tables` support. `ChartTooltip` rows take `shape: 'none'` for a row with no key, such as a total.

### Patch Changes

- 15e61f5: `BarChart` with `onRangeSelect` now shades the selected bars whole, from the first bar's left edge to the last bar's right edge, instead of from centre to centre.
- c233778: Clicking a chart no longer draws a focus ring around it in Chrome. Tabbing to a chart still shows the focus ring.
- e5b935a: Update chart time ticks, tooltips, tables and spoken points to the date and time foundations. Ticks read "19:30" and "27 Nov", and tooltips read "Fri 27 Nov 2026, 7:30pm", the same strings `<DateTime>` gives.
- b15d667: LineChart's `today` dot now sits on the highlighted series, as the forecast cone does, instead of always on the first series. A numeric x axis no longer borrows the y `format`, so days stop rendering as percentages.
- 56fae75: LineChart and StackedArea keep an annotation label clear of the today label. A label that would cross it reads on the other side of its rule, or drops a line when neither side is clear.
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

## 0.2.0

### Minor Changes

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

- b74a7bd: Charts run on `@tanstack/charts` and `@tanstack/react-charts` 1.1. Tooltips
  are unchanged: charts draw Roadie's own tooltip, not the engine's, so 1.1's
  change to custom tooltip bodies doesn't reach them.
- 0b234a4: Update `--ts-chart-tooltip-background` to `--intent-bg-floating`, so a tooltip
  drawn from it matches `ChartTooltip` and other floating surfaces in dark mode.
- d72d07b: Example data uses invented venue, event and promoter names from the contributing guide's vetted list, so no example reads as a real Oztix client. Affects the chart examples from `@oztix/roadie-charts/examples` and JSDoc in core records and QueryField.
- 0954968: LineChart's end label for the highlighted series, such as "Forecast 96%" on a pace chart, now uses the subtle text colour instead of `--chart-highlight`, so it meets body text contrast (APCA Lc 75) in light and dark. A dot in `--chart-highlight` sits beside it, so it still reads as the highlighted line's label. When one shows, every end label moves right by 10px to leave room for the dot, and the plot is 10px narrower.
- 0a72e40: Every focus ring now has the same shape: 4px wide with no gap, from the `--focus-ring-width`, `--focus-ring-opacity`, and `--focus-ring-opacity-dark` tokens. Plain links and buttons with no Roadie class, such as links in CMS content, now get a 4px ring with no gap, where they had a 2px ring with a 2px gap. The ring's colour is unchanged: it still follows the nearest intent, and fields still use accent, or danger when invalid.

  Components that drew their own ring now use the base ring, so they follow the nearest intent too: a focused chart plot, Toast, and ScrollArea's viewport. The bare NumberField stepper's ring loses its 2px gap. ScrollArea's viewport and the `subtler` Tabs keep the ring inset by its width so their container doesn't clip it.

- 5a3da44: The StackedBars examples label September "Sept", the house date format.
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
