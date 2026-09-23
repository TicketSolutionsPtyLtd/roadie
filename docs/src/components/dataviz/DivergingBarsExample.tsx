const LEGS: [city: string, delta: number][] = [
  ['Brisbane', 24],
  ['Sydney', 12],
  ['Melbourne', 6],
  ['Newcastle', 1],
  ['Perth', -4],
  ['Hobart', -11],
  ['Adelaide', -19],
  ['Darwin', -31]
]
const W = 300
const LEFT = 66
const ROW = 17
const MID = LEFT + (W - LEFT - 30) / 2
const SCALE = (W - LEFT - 30) / 2 / 42

const fill = (delta: number) => {
  const step = Math.min(4, Math.ceil(Math.abs(delta) / 8))
  if (step === 0) return 'var(--chart-diverge-0)'
  return `var(--chart-diverge-${delta > 0 ? 'pos' : 'neg'}-${step})`
}

export function DivergingBarsExample() {
  return (
    <figure className='grid w-full max-w-md gap-2'>
      <figcaption className='grid gap-0.5'>
        <p className='text-display-ui-6 text-strong'>
          Darwin is 31 points behind similar shows
        </p>
        <p className='text-sm text-subtle'>
          Pace index minus 100 for each tour leg, 30 days out.
        </p>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${LEGS.length * ROW + 14}`}
        className='w-full text-[9px] tabular-nums'
        role='img'
        aria-label='Brisbane leads at 24 points ahead. Perth, Hobart, Adelaide and Darwin are behind, Darwin by 31 points.'
      >
        <line
          x1={MID}
          x2={MID}
          y1={0}
          y2={LEGS.length * ROW}
          strokeDasharray='2 2'
          className='stroke-chart-axis'
        />
        {LEGS.map(([city, delta], i) => (
          <g key={city}>
            <text
              x={LEFT - 6}
              y={i * ROW + 10.5}
              textAnchor='end'
              className='fill-chart-value'
            >
              {city}
            </text>
            <rect
              x={delta >= 0 ? MID : MID + delta * SCALE}
              y={i * ROW + 2}
              width={Math.abs(delta) * SCALE}
              height={11}
              rx={3}
              style={{ fill: fill(delta) }}
            />
            <text
              x={MID + delta * SCALE + (delta >= 0 ? 4 : -4)}
              y={i * ROW + 10.5}
              textAnchor={delta >= 0 ? 'start' : 'end'}
              className='fill-chart-label'
            >
              {delta > 0 ? `+${delta}` : delta}
            </text>
          </g>
        ))}
        <text
          x={MID}
          y={LEGS.length * ROW + 11}
          textAnchor='middle'
          className='fill-chart-label'
        >
          Similar shows
        </text>
      </svg>
    </figure>
  )
}
