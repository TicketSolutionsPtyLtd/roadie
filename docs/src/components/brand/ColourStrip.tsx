import {
  type BrandColour,
  type BrandHue,
  brandColours
} from '@/lib/brand-colours'
import { getFamilyTokens } from '@/lib/tokens'

import { getContrastColor } from '@oztix/roadie-core/colors'

const LABEL = {
  black: 'var(--color-neutral-light-12)',
  white: 'var(--color-neutral-light-0)'
}

const HUES: BrandHue[] = ['blue', 'purple', 'orange']

/** The house and spotlight colours of each brand hue, with Blackout, as the page's opening strip. */
export async function ColourStrip() {
  const tokens = await getFamilyTokens('color-scales')
  const pick = (hue: BrandHue, lighting: string) =>
    brandColours(tokens, hue).find(({ name }) => name.startsWith(lighting))!
  const columns: [BrandColour, BrandColour][] = [
    ...HUES.map((hue): [BrandColour, BrandColour] => [
      pick(hue, 'Spotlight'),
      pick(hue, 'House')
    ]),
    [pick('neutral', 'Blackout'), pick('neutral', 'Flood')]
  ]

  return (
    <div data-not-prose data-slot='colour-strip' className='@container'>
      <div className='grid grid-cols-2 gap-1 overflow-hidden rounded-2xl @md:grid-cols-4'>
        {columns.map(([spotlight, house]) => (
          <div key={spotlight.token} className='grid grid-rows-[2fr_1fr]'>
            {[spotlight, house].map(({ name, hex }) => (
              <div
                key={name}
                className='grid min-h-16 content-end p-3 text-sm font-semibold @md:min-h-24'
                // Brand artwork keeps its light value in both themes, so the strip paints the hex.
                style={{
                  backgroundColor: hex,
                  color: LABEL[getContrastColor(hex)]
                }}
              >
                {name}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
