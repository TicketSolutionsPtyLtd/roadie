import type { BrandColour } from '@/lib/brand-colours'

import { Badge } from '@oztix/roadie-components/badge'
import { getContrastColor } from '@oztix/roadie-core/colors'

import { CopyToastChip } from '../tokens/CopyToastChip'

// The brand's dark text is Blackout and its light text Flood, both pinned so
// a swatch reads the same in dark mode.
const LABEL = {
  black: 'var(--color-neutral-light-12)',
  white: 'var(--color-neutral-light-0)'
}

/** One copyable value on a swatch card: its label in a narrow column, the value beside it. */
function SwatchValue({
  label,
  value,
  swatch,
  derived = false
}: {
  label: string
  value: string
  /** The card's colour, shown beside the value in the copy toast. */
  swatch: string
  /** Marks a print value converted from the screen value. */
  derived?: boolean
}) {
  return (
    <div className='grid grid-cols-[3rem_1fr] items-center gap-1 py-1'>
      <dt className='text-xs text-subtle'>{label}</dt>
      <dd className='flex min-w-0 flex-wrap items-center gap-1'>
        <CopyToastChip
          value={value}
          swatch={swatch}
          nowrap
          className='-ms-1.5 text-xs text-strong'
        >
          <code data-twin-cell>
            {value}
            {derived && <span className='sr-only'> (derived)</span>}
          </code>
        </CopyToastChip>
        {derived && (
          <Badge size='sm' emphasis='subtle' aria-hidden>
            derived
          </Badge>
        )}
      </dd>
    </div>
  )
}

/** A brand colour as a swatch with its token, hex, and CMYK, each copied on click. */
export function BrandSwatchCard({
  colour: { name, token, hex, cmyk, derived }
}: {
  colour: BrandColour
}) {
  return (
    <li
      data-twin-row
      className='grid emphasis-raised content-start gap-1 rounded-lg p-1.5'
    >
      <div
        data-slot='brand-swatch'
        title={token}
        className='grid h-16 content-end rounded-md border border-subtler p-2 text-sm font-semibold'
        // Brand artwork keeps its light value in both themes, so the swatch paints the hex, not a themed utility.
        style={{ backgroundColor: hex, color: LABEL[getContrastColor(hex)] }}
      >
        <span data-twin-cell>{name}</span>
      </div>
      <dl className='grid divide-y divide-subtler px-1.5'>
        <SwatchValue label='Token' value={token} swatch={hex} />
        <SwatchValue label='Hex' value={hex} swatch={hex} />
        <SwatchValue label='CMYK' value={cmyk} swatch={hex} derived={derived} />
      </dl>
    </li>
  )
}
