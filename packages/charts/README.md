# @oztix/roadie-charts

Chart and dashboard composition for the [Roadie Design System](https://github.com/TicketSolutionsPtyLtd/roadie).
Wraps `@oztix/roadie-components` primitives (`DataCard`, `DataTable`, `ToggleGroup`)
into the chart pieces that sit inside a `Dashboard`.

## Install

```bash
pnpm add @oztix/roadie-charts
```

```css
/* app/globals.css */
@import '@oztix/roadie-core/css';
@import '@oztix/roadie-components/css';
@import '@oztix/roadie-charts/css';
```

## Chart

A `DataCard` framed with a Chart and Table toggle. The chart view renders the
`children` plot; the table view renders the exact numbers behind it.

```tsx
import { Chart } from '@oztix/roadie-charts'

;<Chart
  label='Sales pace'
  value={0.61}
  format='percent'
  source='Oztix sales. 38 similar shows.'
  size='lg'
  table={{
    columns: [{ key: 'day', header: 'Days to show', kind: 'number' }],
    rows: [{ day: 30 }]
  }}
>
  <MyPlot />
</Chart>
```

## License

ISC — see [LICENSE](./LICENSE).
