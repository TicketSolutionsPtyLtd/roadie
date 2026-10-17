import { BRAND_HUES, type BrandHue, brandColours } from '@/lib/brand-colours'
import { getFamilyTokens } from '@/lib/tokens'

import { CopyChip } from '../tokens/CopyChip'
import { BrandSwatchCard } from './BrandSwatchCard'

/** A brand hue's lighting steps in their light-mode colours, which brand artwork keeps in both themes. */
export async function BrandSwatches({ hue }: { hue: BrandHue }) {
  const colours = brandColours(await getFamilyTokens('color-scales'), hue)
  const { intent } = BRAND_HUES[hue]

  return (
    <div
      data-not-prose
      data-slot={`brand-swatches-${hue}`}
      className='grid gap-3'
    >
      {intent && (
        <p className='flex flex-wrap items-center gap-1 text-sm text-subtle'>
          Intent
          <CopyChip value={intent} nowrap className='text-strong'>
            <code>{intent}</code>
          </CopyChip>
        </p>
      )}
      <ol className='grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-2'>
        {colours.map((colour) => (
          <BrandSwatchCard key={colour.token} colour={colour} />
        ))}
      </ol>
    </div>
  )
}
