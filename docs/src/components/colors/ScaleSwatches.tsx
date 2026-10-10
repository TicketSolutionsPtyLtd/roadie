import { colorScales } from '@/lib/color-tables'
import { getFamilyTokens } from '@/lib/tokens'

/** Every colour scale's steps, each a swatch in the current theme. */
export async function ScaleSwatches({
  followingAccent = false
}: {
  /** Only the scales `--accent-hue` drives. */
  followingAccent?: boolean
}) {
  const scales = colorScales(
    await getFamilyTokens('color-scales'),
    followingAccent
  )

  return (
    <ul data-not-prose data-slot='scale-swatches' className='grid gap-6'>
      {scales.map(({ scale, label, steps }) => (
        <li key={scale} data-scale={scale} className='grid gap-1'>
          <p className='text-sm text-strong'>{label}</p>
          <ol className='grid auto-cols-fr grid-flow-col gap-0.5'>
            {steps.map(({ name, step }) => (
              <li key={name} className='grid gap-1'>
                <div
                  data-slot='scale-swatch'
                  title={name}
                  className='h-10 rounded-sm'
                  // A class built from data never reaches Tailwind, so the swatch reads the token.
                  style={{ backgroundColor: `var(${name})` }}
                />
                <span className='text-center text-xs text-subtler'>{step}</span>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  )
}
