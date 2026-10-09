import { getFamilyTokens } from '@/lib/tokens'

const STEP = /^--color-([a-z-]+)-(\d+)$/

type Scale = { label: string; steps: { name: string; step: string }[] }

/** Every colour scale's steps, each a swatch in the current theme. */
export async function ScaleSwatches() {
  const scales = new Map<string, Scale>()
  for (const { name, group } of await getFamilyTokens('color-scales')) {
    const [, scale, step] = name.match(STEP) ?? []
    if (!scale || !step || scale.endsWith('-light')) continue
    const entry = scales.get(scale) ?? { label: group, steps: [] }
    entry.steps.push({ name, step })
    scales.set(scale, entry)
  }

  return (
    <ul data-not-prose data-slot='scale-swatches' className='grid gap-6'>
      {[...scales].map(([scale, { label, steps }]) => (
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
