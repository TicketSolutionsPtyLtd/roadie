const STRIPS = {
  categorical: Array.from({ length: 8 }, (_, i) => `chart-${i + 1}`),
  heat: Array.from({ length: 9 }, (_, i) => `chart-heat-${i}`),
  diverging: [
    'chart-diverge-pos-4',
    'chart-diverge-pos-3',
    'chart-diverge-pos-2',
    'chart-diverge-pos-1',
    'chart-diverge-0',
    'chart-diverge-neg-1',
    'chart-diverge-neg-2',
    'chart-diverge-neg-3',
    'chart-diverge-neg-4'
  ],
  status: [
    'chart-status-good',
    'chart-status-warning',
    'chart-status-serious',
    'chart-status-critical'
  ]
} as const

export function DatavizSwatches({ kind }: { kind: keyof typeof STRIPS }) {
  const tokens = STRIPS[kind]
  const joined = kind === 'heat' || kind === 'diverging'
  return (
    <div
      className={`grid ${joined ? 'gap-0' : 'gap-1'}`}
      style={{
        gridTemplateColumns: `repeat(${tokens.length}, minmax(0, 1fr))`
      }}
    >
      {tokens.map((token) => (
        <div key={token} className='grid gap-1'>
          <div
            className={`h-10 ${joined ? 'first:rounded-l-md last:rounded-r-md' : 'rounded-md'}`}
            style={{ backgroundColor: `var(--${token})` }}
            title={`--${token}`}
          />
          <p className='truncate text-center font-mono text-xs text-subtler'>
            {token
              .replace('chart-', '')
              .replace('diverge-', '')
              .replace('status-', '')}
          </p>
        </div>
      ))}
    </div>
  )
}
