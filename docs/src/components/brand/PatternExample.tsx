import { Logo } from '@oztix/roadie-components/logo'
import { Pattern, type PatternTone } from '@oztix/roadie-components/pattern'

const TONES: { tone: PatternTone; label: string }[] = [
  { tone: 'brand-blue', label: 'Blue' },
  { tone: 'brand-purple', label: 'Purple' },
  { tone: 'brand-orange', label: 'Orange' }
]

/** The live pattern as a wide banner, a portrait crop per brand colour, or behind the black strip. */
export function PatternExample({
  kind
}: {
  kind: 'banner' | 'tones' | 'strip'
}) {
  if (kind === 'tones')
    return (
      <ul data-not-prose className='grid grid-cols-3 gap-2'>
        {TONES.map(({ tone, label }) => (
          <li key={tone} className='grid gap-1.5'>
            <Pattern tone={tone} className='aspect-3/4 rounded-xl' />
            <p className='text-sm text-subtle'>{label}</p>
          </li>
        ))}
      </ul>
    )

  if (kind === 'strip')
    return (
      <div
        role='img'
        aria-label='The blue pattern with a black strip across it holding the light logo and tagline'
        className='relative grid h-40 w-full items-center overflow-hidden rounded-lg'
      >
        <Pattern crop='banner' className='absolute inset-0' />
        <div
          className='relative grid justify-items-center py-4'
          // The strip is brand artwork, so it stays black in dark mode.
          style={{ backgroundColor: 'var(--color-neutral-light-12)' }}
        >
          <Logo variant='tagline' tone='light' size='sm' aria-hidden />
        </div>
      </div>
    )

  return (
    <div data-not-prose className='grid'>
      <Pattern crop='banner' className='h-40 rounded-3xl' />
    </div>
  )
}
