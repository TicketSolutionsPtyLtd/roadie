# @oztix/roadie-charts

Chart types, chart cards and dashboards for the
[Roadie Design System](https://ticketsolutionsptyltd.github.io/roadie/charts).
Built on `@oztix/roadie-components` and TanStack Charts, with Roadie's
colour-blind-safe palettes and plain-language headlines.

## Install

```bash
pnpm add @oztix/roadie-charts @oztix/roadie-components @oztix/roadie-core
```

```css
/* app/globals.css */
@import '@oztix/roadie-core/css';
@import '@oztix/roadie-components/css';
@import '@oztix/roadie-charts/css';
```

## Charts

Put a chart type inside a `Chart` card. The card toggles between the chart and
a table of the numbers behind it, and the chart supplies that table and a
summary for screen readers:

```tsx
import { Chart } from '@oztix/roadie-charts/chart'
import { LineChart } from '@oztix/roadie-charts/line-chart'

export function TicketsSold() {
  return (
    <Chart label='Tickets sold' source='Oztix sales.' size='md'>
      <LineChart
        data={[
          { day: '2026-10-01', sold: 120 },
          { day: '2026-10-15', sold: 690 },
          { day: '2026-10-29', sold: 1464 }
        ]}
        x='day'
        y='sold'
      />
    </Chart>
  )
}
```

| Chart            | Subpath            | For                                             |
| ---------------- | ------------------ | ----------------------------------------------- |
| `LineChart`      | `/line-chart`      | Change over time, pace against similar shows    |
| `BarChart`       | `/bar-chart`       | Bars over time, with an optional second measure |
| `RankedBars`     | `/ranked-bars`     | Channels, places and brackets, largest first    |
| `StackedBars`    | `/stacked-bars`    | Parts of a whole across categories              |
| `Histogram`      | `/histogram`       | How a number spreads, such as booking lead time |
| `Funnel`         | `/funnel`          | Conversion and drop-off between steps           |
| `Heatmap`        | `/heatmap`         | Two categories at once, such as day by hour     |
| `Scatter`        | `/scatter`         | Points by two measures, with named quadrants    |
| `SmallMultiples` | `/small-multiples` | One small chart per gate, show or channel       |

Charts take no colour props. Where a chart offers them, `highlight` brings one
series forward and `palette` picks a different set.

## Dashboards

Describe a dashboard as data with `@oztix/roadie-core/dashboard`, check it
with `validateDashboard`, then render it with `DashboardView`. Card actions
come from your app, not the description:

```tsx
import { DashboardView } from '@oztix/roadie-charts/dashboard-view'

;<DashboardView spec={spec} cardActions={(card) => <MyActions card={card} />} />
```

## Server and static output

- **`@oztix/roadie-charts/static`** renders any chart to an SVG string in Node
  with `renderChartSvg(definition, props, { mode, width, height })`, for
  reports, PDFs and slides.
- **`@oztix/roadie-charts/tables`** builds a chart's table rows on the server,
  and `cardTable(card)` builds a dashboard card's.

The chart subpaths are client components and export only components.

## Documentation

Chart guidelines, every chart type and worked dashboards are at
[ticketsolutionsptyltd.github.io/roadie/charts](https://ticketsolutionsptyltd.github.io/roadie/charts).

## License

ISC: see [LICENSE](./LICENSE).
