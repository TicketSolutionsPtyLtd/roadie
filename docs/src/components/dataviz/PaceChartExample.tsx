const W = 490
const H = 220
const L = 38
const R = 108
const T = 12
const B = 22
const TODAY = 30

const x = (daysOut: number) => L + ((90 - daysOut) / 90) * (W - L - R)
const y = (share: number) => T + (1 - share) * (H - T - B)
const bench = (d: number) => {
  const t = (90 - d) / 90
  return 0.14 + 0.36 * (1 - Math.exp(-3 * t)) + 0.38 * t ** 4
}
const actual = (d: number) =>
  bench(d) +
  0.05 * Math.sin((2 * Math.PI * (90 - d)) / 50) +
  0.04 * ((90 - d) / 60)
const forecast = (d: number) => actual(TODAY) + (bench(d) - bench(TODAY)) * 1.02
const spread = (d: number) => ((TODAY - d) / TODAY) * 0.07
const pct = (v: number) => `${Math.round(v * 100)}%`

function points(f: (d: number) => number, from: number, to: number) {
  const out: string[] = []
  const step = from > to ? -2 : 2
  for (let d = from; from > to ? d >= to : d <= to; d += step)
    out.push(`${x(d).toFixed(1)},${y(f(d)).toFixed(1)}`)
  return out.join(' ')
}

type EndLabel = [y: number, text: string, className: string]

function stackLabels(items: EndLabel[]) {
  const sorted = [...items].sort((a, b) => a[0] - b[0])
  for (let i = 1; i < sorted.length; i++)
    sorted[i]![0] = Math.max(sorted[i]![0], sorted[i - 1]![0] + 13)
  return sorted
}

const halo = {
  stroke: 'var(--chart-gap)',
  strokeWidth: 3,
  paintOrder: 'stroke'
} as const

export function PaceChartExample({
  title = 'Tracking ahead of similar shows'
}: {
  title?: string
}) {
  const ends = stackLabels([
    [y(0.85), 'Target 85%', 'fill-chart-value font-semibold'],
    [
      y(forecast(0)),
      `Forecast ${pct(forecast(0))}`,
      'fill-chart-value font-semibold'
    ],
    [y(bench(0)), 'Similar shows', 'fill-chart-label']
  ])

  return (
    <figure className='grid w-full max-w-2xl gap-2 font-sans'>
      <figcaption className='grid gap-0.5'>
        <p className='text-display-ui-6 text-strong'>{title}</p>
        <p className='text-sm text-subtle'>
          % of sellable capacity sold, by days to show.
        </p>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className='w-full text-[10px] tabular-nums'
        role='img'
        aria-label={`${title}. ${pct(actual(TODAY))} sold 30 days out. Forecast ${pct(forecast(0))} against a target of 85%.`}
      >
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1={L}
              x2={W - R}
              y1={y(v)}
              y2={y(v)}
              className='stroke-chart-grid'
            />
            <text
              x={L - 6}
              y={y(v) + 3}
              textAnchor='end'
              className='fill-chart-label'
            >
              {pct(v)}
            </text>
          </g>
        ))}
        {[90, 60, 30, 0].map((d) => (
          <text
            key={d}
            x={x(d)}
            y={H - 6}
            textAnchor='middle'
            className='fill-chart-label'
          >
            {d === 0 ? 'Show' : `${d}d`}
          </text>
        ))}
        <polygon
          points={`${points((d) => bench(d) + 0.08, 90, 0)} ${points((d) => bench(d) - 0.07, 0, 90)}`}
          className='fill-chart-band'
        />
        <polyline
          points={points(bench, 90, 0)}
          fill='none'
          strokeWidth={1.25}
          strokeDasharray='3 3'
          className='stroke-chart-median'
        />
        <polygon
          points={`${points((d) => forecast(d) + spread(d), TODAY, 0)} ${points((d) => forecast(d) - spread(d), 0, TODAY)}`}
          className='fill-chart-highlight'
          opacity={0.1}
        />
        <polyline
          points={points(forecast, TODAY, 0)}
          fill='none'
          strokeWidth={2}
          strokeDasharray='0.5 4'
          strokeLinecap='round'
          className='stroke-chart-highlight'
        />
        <polyline
          points={points(actual, 90, TODAY)}
          fill='none'
          strokeWidth={2}
          strokeLinejoin='round'
          strokeLinecap='round'
          className='stroke-chart-highlight'
        />
        <line
          x1={W - R - 10}
          x2={W - R}
          y1={y(0.85)}
          y2={y(0.85)}
          strokeWidth={2}
          strokeLinecap='round'
          className='stroke-chart-value'
        />
        <line
          x1={x(TODAY)}
          x2={x(TODAY)}
          y1={H - B}
          y2={H - B + 4}
          className='stroke-chart-axis'
        />
        <circle
          cx={x(TODAY)}
          cy={y(actual(TODAY))}
          r={3.5}
          strokeWidth={1.5}
          className='fill-chart-highlight stroke-chart-gap'
        />
        <text
          x={x(TODAY)}
          y={y(actual(TODAY)) - 9}
          textAnchor='middle'
          className='fill-chart-value font-semibold'
          style={halo}
        >
          Today {pct(actual(TODAY))}
        </text>
        {ends.map(([ly, text, className]) => (
          <text
            key={text}
            x={W - R + 8}
            y={ly + 3.5}
            className={className}
            style={halo}
          >
            {text}
          </text>
        ))}
      </svg>
      <p className='text-xs text-subtler'>
        Similar shows: 38 comparable 1,500 to 5,000 capacity shows over the last
        3 years. Source: Oztix ticketing data.
      </p>
    </figure>
  )
}
