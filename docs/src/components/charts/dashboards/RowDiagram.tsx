import {
  CARD_SPANS,
  type CardSize,
  DASHBOARD_TRACKS,
  DASHBOARD_WIDTHS,
  type DashboardWidth
} from '@oztix/roadie-core/dashboard-layout'

export const WIDTH_NAME: Record<DashboardWidth, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  phone: 'Phone'
}

const SPAN_CLASS: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12'
}

const TRACK_CLASS: Record<DashboardWidth, string> = {
  desktop: 'grid-cols-12',
  tablet: 'grid-cols-6',
  phone: 'grid-cols-2'
}

type Slot = { size: CardSize; span: number } | { gap: number }

function packRows(sizes: CardSize[], width: DashboardWidth) {
  const tracks = DASHBOARD_TRACKS[width]
  const slots: Slot[] = []
  let used = 0
  for (const size of sizes) {
    const span = CARD_SPANS[size][width]
    if (used + span > tracks) {
      slots.push({ gap: tracks - used })
      used = 0
    }
    slots.push({ size, span })
    used = (used + span) % tracks
  }
  if (used > 0) slots.push({ gap: tracks - used })
  return slots
}

/** Cards packed into rows at one width, with any gap a row leaves. */
export function WidthDiagram({
  sizes,
  width,
  labelled = false
}: {
  sizes: CardSize[]
  width: DashboardWidth
  labelled?: boolean
}) {
  return (
    <div
      className={`grid ${labelled ? 'gap-1' : 'gap-0.5'} ${TRACK_CLASS[width]}`}
    >
      {packRows(sizes, width).map((slot, i) =>
        'gap' in slot ? (
          <div
            key={i}
            className={`${SPAN_CLASS[slot.gap]} grid h-6 place-content-center rounded-sm border border-dashed border-normal text-xs text-subtle intent-danger`}
          >
            {labelled && 'Gap'}
          </div>
        ) : (
          <div
            key={i}
            className={`${SPAN_CLASS[slot.span]} grid h-6 place-content-center rounded-sm emphasis-subtle font-mono text-xs`}
          >
            {labelled && slot.size}
          </div>
        )
      )}
    </div>
  )
}

/** The same cards at desktop, tablet, and phone widths. */
export function RowDiagram({ sizes }: { sizes: CardSize[] }) {
  return (
    <div data-not-prose className='grid w-full gap-3'>
      {DASHBOARD_WIDTHS.map((width) => (
        <div key={width} className='grid gap-1'>
          <p className='text-xs text-subtle'>{WIDTH_NAME[width]}</p>
          <WidthDiagram sizes={sizes} width={width} labelled />
        </div>
      ))}
    </div>
  )
}
