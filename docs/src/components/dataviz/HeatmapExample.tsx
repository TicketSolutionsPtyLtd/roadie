const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const CELL_W = 11
const CELL_H = 13
const LEFT = 30

function orders(day: number, hour: number) {
  const evening = Math.exp(-((hour - 20.5) ** 2) / 8)
  const lunch = 0.45 * Math.exp(-((hour - 12.5) ** 2) / 3)
  const onSale =
    day === 4 && hour === 10 ? 1.4 : day === 4 && hour === 11 ? 0.8 : 0
  const weekend = day >= 5 ? 0.15 : 0
  const overnight = hour < 7 ? -0.5 : 0
  const weight = day === 3 || day === 6 ? 1 : 0.75
  const raw = evening * weight + lunch + onSale + weekend + overnight
  return Math.max(0, Math.min(1, raw / 1.3))
}

const hourLabel = (h: number) =>
  h === 0 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`

export function HeatmapExample() {
  return (
    <figure className='grid w-full max-w-xl gap-2'>
      <figcaption className='grid gap-0.5'>
        <p className='text-display-ui-6 text-strong'>
          Fans bought most on Friday at 10am
        </p>
        <p className='text-sm text-subtle'>
          Orders by hour and weekday for Hollow Pines Festival.
        </p>
      </figcaption>
      <svg
        viewBox={`0 0 ${LEFT + 24 * CELL_W + 4} ${7 * CELL_H + 14}`}
        className='w-full text-[8.5px]'
        role='img'
        aria-label='Heatmap of orders by hour and weekday. Orders peak on Friday at 10am, the on-sale hour, and every evening around 8pm.'
      >
        {DAYS.map((day, d) => (
          <g key={day}>
            <text
              x={LEFT - 5}
              y={d * CELL_H + 9.5}
              textAnchor='end'
              className='fill-chart-label'
            >
              {day}
            </text>
            {Array.from({ length: 24 }, (_, h) => (
              <rect
                key={h}
                x={LEFT + h * CELL_W}
                y={d * CELL_H}
                width={CELL_W - 1.5}
                height={CELL_H - 1.5}
                rx={2}
                style={{
                  fill: `var(--chart-heat-${Math.round(orders(d, h) * 8)})`
                }}
              />
            ))}
          </g>
        ))}
        {[0, 6, 12, 18].map((h) => (
          <text
            key={h}
            x={LEFT + h * CELL_W}
            y={7 * CELL_H + 10}
            className='fill-chart-label'
          >
            {hourLabel(h)}
          </text>
        ))}
      </svg>
    </figure>
  )
}
