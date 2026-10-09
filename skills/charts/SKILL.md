---
name: charts
description: Use when building or changing a chart, graph, stat tile, KPI row, sparkline, meter, dashboard table, or dashboard in an app that uses Roadie (`@oztix/roadie-charts`, `@oztix/roadie-components`, or `@oztix/roadie-core`). Use it in place of the generic dataviz skill there. Picks the Roadie chart for the job, or a table or StatTile instead, colours with Roadie's chart tokens, describes dashboards as data checked with validateDashboard, wires actions and row links from the app, and writes chart copy in the house style. Triggers on "chart", "graph", "plot", "dashboard", "visualise", "stat tile", "KPI", "sparkline", "heatmap", "chart colours".
---

# Roadie charts

Build charts and dashboards from Roadie's chart components and tokens, so they
read as one system with every other Oztix dashboard. This skill holds the
decisions agents get wrong. The detail lives in two places:

- **The installed manifest**, which matches the version in the app:
  `node_modules/@oztix/roadie-charts/dist/roadie.manifest.json`, and the same
  file in `@oztix/roadie-core` and `@oztix/roadie-components`. It lists every
  subpath, component, prop, and deprecation, with a link to each docs page.
  Read it before guessing a prop. Older releases don't ship it; read the
  package's `.d.ts` files instead.
- **The docs index**, `https://ticketsolutionsptyltd.github.io/roadie/llms.txt`.
  Links ending in `.md` are markdown with props. Read
  [Data visualisation](https://ticketsolutionsptyltd.github.io/roadie/charts/data-visualisation/)
  before any chart and
  [Dashboard design](https://ticketsolutionsptyltd.github.io/roadie/charts/dashboards/)
  before any dashboard.

Never draw a chart by hand, and never add another chart library (Recharts,
Chart.js, D3, Plotly) beside Roadie's.

## 0. Check the setup

- `@oztix/roadie-charts`, `@oztix/roadie-components`, and `@oztix/roadie-core`
  are installed.
- The main CSS file imports each package's CSS, or Tailwind purges the chart
  classes:

  ```css
  @import '@oztix/roadie-core/css';
  @import '@oztix/roadie-components/css';
  @import '@oztix/roadie-charts/css';
  ```

- Import each component from its own subpath, never the root barrel:
  `@oztix/roadie-charts/line-chart`, `@oztix/roadie-components/stat-tile`.
  `RoadieProvider`, mounted once at the app root, is the one root import.

## 1. Pick the form from the job

Name the decision the reader will make first. If no shape helps them make it,
show a number or a table, not a chart.

| Job                      | Use                                         | Plot `kind`       |
| ------------------------ | ------------------------------------------- | ----------------- |
| One number, right now    | `StatTile` (`/stat-tile`), not a chart      |                   |
| Progress to a limit      | `Meter` (`/meter`), or a table of meters    |                   |
| Compare, or where        | `RankedBars` (`/ranked-bars`), never a pie  | `ranked-bars`     |
| Change over time         | `LineChart` or `BarChart`                   | `line`, `bar`     |
| Pace against similar     | `LineChart` with `band`, `target`, `today`  | `line`            |
| Part of a whole          | `StackedBars`, or a capacity `Meter`        | `stacked-bars`    |
| Spread                   | `Histogram`                                 | `histogram`       |
| Drop off                 | `Funnel`                                    | `funnel`          |
| Two measures per item    | `Scatter`                                   | `scatter`         |
| The same chart per group | `SmallMultiples`                            | `small-multiples` |
| When (hour by weekday)   | `Heatmap`                                   | `heatmap`         |
| Several items to scan    | `DataTable` (`/data-table`) in a `DataCard` |                   |

`StatTile`, `Meter`, `Sparkline`, `DataCard`, `DataTable`, `Delta`, and
`Dashboard` come from `@oztix/roadie-components`. The charts, `Chart`,
`ChartLegend`, and `DashboardView` come from `@oztix/roadie-charts`.

Pick a table instead when:

- people search, sort, or page through the rows: `RecordTable` in a Pane, not
  a dashboard card;
- the card would list people or orders: show the count in a `StatTile` and
  link to the list;
- it has one row: use a `StatTile`;
- it's sell-through by section with no second dimension: a `DataTable` of
  meters reads better than a heatmap.

A `DataTable` holds about 25 rows or fewer, at most two visual columns
(sparkline or meter), a `priority` on low-value columns, and `pin: true` on the
name column. See
[Tables](https://ticketsolutionsptyltd.github.io/roadie/foundations/tables/).

Keep it honest: one y-axis (two measures on different scales are two charts),
bars from zero, sell-through against sellable capacity, a range with every
forecast, and a named comparison set.

## 2. Colour by job

Roadie's charts take **no colour props**. You choose the job, and the chart
picks the tokens:

| Job                       | How                                                                          |
| ------------------------- | ---------------------------------------------------------------------------- |
| Tell series apart         | Default categorical slots, in data order, 6 then "Other"                     |
| Two or three fixed series | `palette='pair'` or `'trio'` (ticket types keep colours)                     |
| How much                  | `Heatmap` default `scale='sequential'`                                       |
| Ahead of or behind        | `Heatmap scale='diverging'` (cool ahead, warm behind)                        |
| The story series          | `highlight='Email'`, so the rest falls back to context grey                  |
| Good or bad               | `Delta` and `StatTile` `delta`, with `goodWhen='down'` where falling is good |

Only reach for tokens when you draw your own marks, such as a legend swatch or
an inline SVG:

- Classes `fill-chart-*`, `stroke-chart-*`, and `bg-chart-*` take each
  token's name: `--chart-1` to `--chart-8`, `pair-1` and `pair-2`, `trio-1` to
  `trio-3`, `heat-0` to `heat-8`, `diverge-neg-4` to `diverge-pos-4`,
  `status-good`, `status-warning`, `status-serious`, `status-critical`,
  `highlight`, and `context`. So `--chart-3` is `fill-chart-3`.
- A slot chosen at runtime: `style={{ fill: chartColorVar(i + 1) }}` from
  `@oztix/roadie-core/dataviz`. Tailwind can't see `` `fill-chart-${i}` ``, so
  it's purged.
- Canvas, PDF, or email, where CSS variables don't resolve:
  `chartHex(mode, accentHue)` from `@oztix/roadie-core/dataviz` returns hex
  values for `'light'` or `'dark'`.
- A legend item in a dashboard spec takes `color: 'var(--chart-band)'` or
  another `var(--chart-*)`, nothing else.

Never:

- hex, `rgb()`, `oklch()`, a Tailwind palette class, or a `dark:` variant;
- an intent scale (`bg-brand-9`) or a status colour as a series colour;
- more than 6 series (group the rest into Other), cycling slots, or
  recolouring a series when you sort or filter;
- text in a series colour (labels use chart ink), or text on a light slot;
- colour as the only signal: pair it with a label, a legend, or an arrow and
  words.

## 3. A chart card

Put every chart in a `Chart` card. The card sets the plot's height from its
`size`, adds the Chart and Table switch, and builds the Table view from the
chart inside it, so **don't pass `table`**.

```tsx
import { Chart } from '@oztix/roadie-charts/chart'
import { RankedBars } from '@oztix/roadie-charts/ranked-bars'

const channels = [
  { channel: 'Email', orders: 612 },
  { channel: 'Instagram', orders: 388 },
  { channel: 'Direct', orders: 301 }
]

export function BuyerChannels() {
  return (
    <Chart
      size='md'
      label='Buyer channels'
      takeaway='Email brings in nearly half of orders'
      source='Oztix sales, 1 to 30 Sept, pulled Thu 1 Oct.'
    >
      <RankedBars
        data={channels}
        x='channel'
        y='orders'
        highlight='Email'
        takeaway='Email brought in 612 of 1,301 orders, 224 more than Instagram'
      />
    </Chart>
  )
}
```

- `source` is required.
- The headline is a `value` with a `delta`, or a `takeaway` sentence. Never
  both.
- The plot's own `takeaway` is the summary a screen reader hears, so give it
  the numbers, and check them against the data.
- Pass `table` only when the Table view renders on the server or without
  JavaScript (build it with `@oztix/roadie-charts/tables`), when it should show
  different numbers from the plot, or for a static image plot, which needs one.
- Send dates as ISO strings in the venue's wall time, and `null` for a missing
  day rather than leaving it out.

## 4. Dashboards as data

Describe a dashboard as a `DashboardSpec`, check it with `validateDashboard`,
and render it with `DashboardView`. Agents can check a spec before anyone sees
it. Hand-written `Dashboard` JSX skips the copy, size, and source checks.

```tsx
import { DashboardView } from '@oztix/roadie-charts/dashboard-view'
import {
  type DashboardSpec,
  validateDashboard
} from '@oztix/roadie-core/dashboard'

const spec: DashboardSpec = {
  version: 1,
  title: 'Ball Park Music at Kazoo Hollow Room',
  sections: [
    {
      title: 'At a glance',
      cards: [
        {
          id: 'sold',
          kind: 'stat',
          size: 'stat',
          label: 'Tickets sold',
          value: 1464,
          delta: { value: 216 },
          context: 'This week, of 2,400'
        }
        // three more stat cards fill the row
      ]
    },
    {
      title: 'Sales',
      cards: [
        {
          id: 'pace',
          kind: 'chart',
          size: 'full',
          label: 'Sales pace',
          takeaway: 'Tracking 16 points ahead of similar shows',
          plot: {
            kind: 'line',
            data: pace,
            x: 'day',
            y: 'sold',
            format: 'percent'
          },
          source:
            'Oztix sales, pulled Thu 15 Oct. 38 similar shows, last 3 years.'
        }
      ]
    }
  ]
}

const result = validateDashboard(spec)
if (!result.ok)
  throw new Error(
    result.problems.map((p) => `${p.path}: ${p.message}`).join('\n')
  )
// Warnings are gaps in rows, copy that truncates, dashes, and title case.
// Fix them, or fail on them in a test, rather than shipping them.
```

- Card `kind` is `stat`, `table`, `chart`, or `note`. A chart card's `plot` is
  `{ kind, ...props }`, where `kind` is `line`, `bar`, `ranked-bars`,
  `stacked-bars`, `histogram`, `funnel`, `heatmap`, `scatter`, or
  `small-multiples`.
- Card `size` is `stat` (stat cards only), `sm`, `md`, `lg`, or `full`. Every
  row must fill at desktop (12 tracks), tablet (6), and phone (2). Safe rows:
  four `stat`, two `md`, one `full`, six `sm`, or `lg` + `sm` then `sm` +
  `lg`. Never `lg` then `md`. Change a size, never the order, to fill a gap.
- Copy limits: a stat label 19 characters, a chart label 21 at `sm` and `md`
  and 27 at `lg` and `full`, 14 to 23 beside a More button. They're
  `COPY_LIMITS`, `CHART_LABEL_LIMITS`, and `ACTIONS_LABEL_LIMITS` in the
  zod-free `@oztix/roadie-core/dashboard-layout`. Import from there when UI
  code only needs sizes or limits.
- Every card answers one question. Start with a `note` card that says what to
  do next when the dashboard has a clear action.
- Each card takes a `state` (`loading`, `empty`, `error`, or `stale`) that the
  app sets. An empty card says what happened and what to do next. Never draw a
  chart of zeros.
- `createShowDashboard()` from `@oztix/roadie-charts/examples` is a complete,
  valid spec to start from.

### Periods and comparisons

A spec can carry `period: { range, compare }`, where `range` is a
`DateRangeValue` such as `'last-month'` or `{ period: 'month', offset: 0,
toDate: true }`, and `compare` is `'previous-period'`, `'previous-year'`, or
custom dates.

- Mark a delta that follows the period `comparison: true`, and leave out the
  card's `context`: the card names the comparison itself. A comparison delta
  with no period fails validation.
- An app's own comparison, such as `compare: 'similar'`, gets no dates from
  Roadie, so comparison deltas hide, as they do with no `compare`. Leave out
  `comparison` there and give the card its own `context`.
- Resolve dates with `resolveDateRange` and `resolveComparison` from
  `@oztix/roadie-core/datetime`, passing `now`, the venue's `timeZone`,
  `dataStart` (the first day the data holds), and, for sales, `dataEnd`, so
  month to date compares with last month to the same day. Read `now` on the
  server or after mount, not during a render that hydrates.
- When `resolveComparison` returns `partial` or `unavailable`, set
  `period.history` to that status, and comparison deltas say "Not enough
  history" or "Nothing to compare".
- To let people change the period, render `DashboardView` from a client
  component with `onPeriodChange`, hold the value as a `DashboardPeriodValue`
  (`@oztix/roadie-components/dashboard-period`), and refetch the cards' numbers
  for the new range and comparison. A period picker over fixed numbers is a
  bug. No chart draws a comparison series; show it as a delta.
- Validate the spec where it's built (on the server, or in a test of the
  builder), not on every client render, which also ships zod to the browser.
- Periods, `onPeriodChange`, and `getRowHref` arrived after
  `@oztix/roadie-charts` 0.1.0. If the manifest doesn't list them, upgrade
  rather than building your own period picker or row links.

The [Dashboard design](https://ticketsolutionsptyltd.github.io/roadie/charts/dashboards/#periods-and-comparisons)
page has the full flow.

## 5. Actions and row links come from the app

Handlers and hrefs never go in the JSON.

```tsx
<DashboardView
  spec={spec}
  cardActions={(card) =>
    card.kind === 'chart' || card.kind === 'table' ? (
      <CardMenu label={card.label} table={cardTable(card)} />
    ) : undefined
  }
  getRowHref={(card, row) =>
    card.id === 'shows' ? `/events/${row.id}` : undefined
  }
/>
```

- `CardMenu` is a `'use client'` component that owns its handlers. Start from
  the reference `CardMenu` in
  [card actions](https://ticketsolutionsptyltd.github.io/roadie/charts/dashboards/#card-actions),
  whose CSV export handles totals, status labels, and quoting.
- Pass `DataCard.MoreButton` to `Menu.Trigger`'s `render` and open with
  `align='end'`. Group items as Chart, Display, Export, then Dashboard, with
  "Remove from dashboard" last in `intent='danger'`, and confirm before it
  removes.
- Leave out every item the app can't do yet, and every group that ends up
  empty. `cardTable` returns `undefined` for stat and note cards, so they get
  no Download CSV.
- At most one visible action, then More, always visible, never hover only.
- Download CSV from `cardTable(card)` (`@oztix/roadie-charts/tables`). Copy as
  image with `renderChartSvg`.
- For a single card outside a spec, pass `actions` to `Chart`, `DataCard`, or
  `StatTile`.

## 6. On the server

Each chart's subpath (`/line-chart` and so on) and `/chart` are `'use client'`
and export only components, so a server can render them but can't call
anything from them. Use `/static` and `/tables` for everything else.

- `DashboardView` is server safe. Return client components from
  `cardActions`, not inline handlers.
- **An image** for email, PDF, a report, or Copy as image:
  `renderChartSvg(lineChart, props, { mode: 'light', width: 640, height: 280 })`
  from `@oztix/roadie-charts/static`, which also exports `barChart`,
  `rankedBars`, `stackedBars`, `histogram`, `funnel`, `heatmap`, `scatter`, and
  `renderSmallMultiplesSvg`. Render at the box's aspect with 12px text.
- **A table** with no JavaScript: `lineChartTable(props)` and the other
  `*Table` builders, `plotTable(plot)`, or `cardTable(card)` from
  `@oztix/roadie-charts/tables`, passed to `Chart`'s `table`.
- A spec with `plot: { kind: 'static', src, alt }` needs a `table`.

## 7. Copy

Follow the house style everywhere a chart has words: titles, labels, context,
annotations, empty states, sources, and summaries.

- **The takeaway states the answer**, with a number or a direction: "Presales
  doubled after the lineup drop", not "Presales over time". Sentence case,
  active voice, no colon, no full stop.
- **Labels are short and fixed**: "Sales pace". Put what a delta compares with
  on the context line, not in the label or the delta.
- **No dashes as punctuation**, anywhere. Ranges use "to": "$50 to $100", "Fri
  27 to Sun 29 Nov". `validateDashboard` flags dashes and title case.
- **Australian spelling**: colour, visualise, organise, cancelled.
- **Numbers**: numerals, commas for thousands, `68%` closed up, `$19.95`,
  `$1,200`. Use the `format` prop (`number`, `compact`, `percent`, `currency`,
  `compactCurrency`, `points`, or `index`) rather than formatting values
  yourself; `formatValue` from `@oztix/roadie-core/dataviz` covers strings
  outside a chart.
- **Dates and times**: "Fri 27 Nov", "7:30pm", in the venue's time zone, from
  `@oztix/roadie-core/datetime` or the `DateTime` component. 24-hour time only
  on dense axes and in exports.
- **House terms**, one name per metric: pace index, sell-through, scan rate,
  ticket type, access code.
- **Annotations** name the cause in 20 characters or fewer: "Lineup announced".
- **Source line** names the data and when: "Oztix sales, pulled Mon 21 Sept."

## 8. Before you hand off

- `validateDashboard` returns no errors and no warnings you haven't read.
- The app typechecks and builds, and nothing imports from a chart subpath on
  the server except components.
- Run `/roadie:audit` on the files you touched (colour checks A1 to A6 and the
  Dashboards section), then `/roadie:review`.
