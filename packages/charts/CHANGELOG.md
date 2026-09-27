# @oztix/roadie-charts

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
