import {
  DATAVIZ_STRIPS,
  type DatavizKind,
  datavizHex,
  datavizLabel
} from '@/lib/color-tables'

import { type Mode, chartHex } from '@oztix/roadie-core/dataviz'

type Kind = DatavizKind

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
            data-slot='dataviz-swatch'
            className='h-10 flex-1 rounded-sm first:rounded-l-md last:rounded-r-md'
            style={{ backgroundColor: datavizHex(kind, mode, index) }}
            title={`--${token}`}
          />
        ))}
      </div>
      <div className='flex gap-0.5'>
        {tokens.map((token) => (
          <p key={token} className='flex-1 text-center text-xs'>
            {datavizLabel(token)}
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
      data-mode={mode}
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
  const tokens = DATAVIZ_STRIPS[kind]
  return (
    <div
      data-not-prose
      data-slot='dataviz-swatches'
      data-kind={kind}
      className='grid gap-3 @xl:grid-cols-2'
    >
      <ThemePanel kind={kind} mode='light' tokens={tokens} />
      <ThemePanel kind={kind} mode='dark' tokens={tokens} />
    </div>
  )
}
