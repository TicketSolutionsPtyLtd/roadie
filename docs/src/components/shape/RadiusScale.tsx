import type { CSSProperties } from 'react'

import { getFamilyTokens } from '@/lib/tokens'

// Tailwind ships it, but Roadie's tiers start at rounded-sm.
const BELOW_TIERS = '--radius-xs'

const REM_PX = 16

function Tile({
  utility,
  value,
  className = '',
  style
}: {
  utility: string
  value: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <li className='grid gap-2'>
      <div
        data-slot='radius-swatch'
        className={`aspect-square border border-subtle bg-raised ${className}`}
        style={style}
      />
      <div className='grid'>
        <code className='font-mono text-sm text-strong'>{utility}</code>
        <p className='text-xs text-subtle'>{value}</p>
      </div>
    </li>
  )
}

/** Every radius tier in the token manifest, on a tile of its own, then rounded-full. */
export async function RadiusScale() {
  const radii = (await getFamilyTokens('shape')).filter(
    (token) => token.group === 'Radius' && token.name !== BELOW_TIERS
  )

  return (
    <div data-not-prose data-slot='radius-scale' className='@container'>
      <ul className='grid grid-cols-2 gap-x-4 gap-y-6 @md:grid-cols-3 @3xl:grid-cols-4'>
        {radii.map(({ name, value }) => {
          const rem = value!.light!
          return (
            <Tile
              key={name}
              utility={name.replace('--radius-', 'rounded-')}
              value={`${parseFloat(rem) * REM_PX}px (${rem})`}
              // A class built from data never reaches Tailwind, so the swatch uses the value.
              style={{ borderRadius: rem }}
            />
          )
        })}
        {/* A utility with no --radius token behind it. */}
        <Tile
          utility='rounded-full'
          value='Fully round'
          className='rounded-full'
        />
      </ul>
    </div>
  )
}
