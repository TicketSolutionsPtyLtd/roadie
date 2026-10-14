import { type BrandHue, brandColours } from '@/lib/brand-colours'
import { getFamilyTokens } from '@/lib/tokens'

import { getContrastColor } from '@oztix/roadie-core/colors'

// The brand's dark text is Blackout and its light text Flood, both pinned so
// a swatch reads the same in dark mode.
const LABEL = {
  black: 'var(--color-neutral-light-12)',
  white: 'var(--color-neutral-light-0)'
}

/** A brand hue's lighting steps in their light-mode colours, which brand artwork keeps in both themes. */
export async function BrandSwatches({ hue }: { hue: BrandHue }) {
  const colours = brandColours(await getFamilyTokens('color-scales'), hue)

  return (
    <div
      data-not-prose
      data-slot={`brand-swatches-${hue}`}
      className='@container'
    >
      <ol className='grid grid-cols-2 gap-2 @lg:grid-cols-3 @3xl:grid-cols-7'>
        {colours.map(({ name, token, hex, cmyk }) => (
          <li
            key={token}
            data-twin-row
            className='grid emphasis-raised content-start gap-1 rounded-lg p-1.5'
          >
            <div
              data-slot='brand-swatch'
              title={token}
              className='grid h-16 content-end rounded-md border border-subtler p-2 text-sm font-semibold'
              // Brand artwork keeps its light value in both themes, so the swatch paints the hex, not a themed utility.
              style={{
                backgroundColor: hex,
                color: LABEL[getContrastColor(hex)]
              }}
            >
              <span data-twin-cell>{name}</span>
            </div>
            <div className='grid gap-0.5 px-1 pb-1 text-xs text-subtle'>
              <code data-twin-cell className='font-mono'>
                {token}
              </code>
              <code data-twin-cell className='font-mono'>
                {hex}
              </code>
              <span>
                {cmyk && 'CMYK '}
                <span data-twin-cell>{cmyk}</span>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
