import { type Mode, chartHex } from '@oztix/roadie-core/dataviz'

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

type Kind = keyof typeof STRIPS

const label = (token: string) =>
  token.replace(/^chart-(heat-|diverge-|status-)?/, '')

function hexAt(kind: Kind, mode: Mode, index: number, name: string) {
  const hex = chartHex(mode)
  if (kind === 'categorical') return hex.categorical[index]
  if (kind === 'heat') return hex.heat[index]
  if (kind === 'diverging') return hex.diverging[index]
  return hex.status[name as keyof typeof hex.status]
}

function Strip({
  kind,
  mode,
  tokens
}: {
  kind: Kind
  mode: Mode
  tokens: readonly string[]
}) {
  return (
    <div className='grid gap-1'>
      <div className='flex gap-0.5'>
        {tokens.map((token, index) => (
          <div
            key={token}
            className='h-10 flex-1 rounded-sm first:rounded-l-md last:rounded-r-md'
            style={{ backgroundColor: hexAt(kind, mode, index, label(token)) }}
            title={`--${token}`}
          />
        ))}
      </div>
      <div className='flex gap-0.5'>
        {tokens.map((token) => (
          <p key={token} className='flex-1 text-center text-xs'>
            {label(token)}
          </p>
        ))}
      </div>
    </div>
  )
}

function ThemePanel({
  kind,
  mode,
  tokens
}: {
  kind: Kind
  mode: Mode
  tokens: readonly string[]
}) {
  const { surface, label: labelColor } = chartHex(mode).chrome
  return (
    <div
      className='grid gap-2 rounded-xl p-3'
      style={{ backgroundColor: surface, color: labelColor }}
    >
      <p className='text-xs'>{mode === 'light' ? 'Light' : 'Dark'}</p>
      <Strip kind={kind} mode={mode} tokens={tokens} />
    </div>
  )
}

/** Each panel reads its hex from chartHex, so both stay exact regardless of the page's own theme. */
export function DatavizSwatches({ kind }: { kind: Kind }) {
  const tokens = STRIPS[kind]
  return (
    <div className='grid gap-3 @xl:grid-cols-2'>
      <ThemePanel kind={kind} mode='light' tokens={tokens} />
      <ThemePanel kind={kind} mode='dark' tokens={tokens} />
    </div>
  )
}
