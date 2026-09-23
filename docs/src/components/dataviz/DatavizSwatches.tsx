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

const label = (token: string) =>
  token.replace(/^chart-(heat-|diverge-|status-)?/, '')

export function DatavizSwatches({ kind }: { kind: keyof typeof STRIPS }) {
  const tokens = STRIPS[kind]
  return (
    <div className='grid gap-1'>
      <div className='flex gap-0.5'>
        {tokens.map((token) => (
          <div
            key={token}
            className='h-10 flex-1 rounded-sm first:rounded-l-md last:rounded-r-md'
            style={{ backgroundColor: `var(--${token})` }}
            title={`--${token}`}
          />
        ))}
      </div>
      <div className='flex gap-0.5'>
        {tokens.map((token) => (
          <p key={token} className='flex-1 text-center text-xs text-subtler'>
            {label(token)}
          </p>
        ))}
      </div>
    </div>
  )
}
