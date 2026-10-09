import { ScaleSwatches } from '@/components/colors/ScaleSwatches'
import { getFamilyTokens } from '@/lib/tokens'

import { DEFAULT_ACCENT_COLOR } from '@oztix/roadie-components'

/** The accent parameters with their defaults, then the scales they drive, live in the current theme. */
export async function AccentScales() {
  const parameters = (await getFamilyTokens('color-scales')).filter(
    ({ group }) => group === 'Accent parameters'
  )

  return (
    <div data-not-prose data-slot='accent-scales' className='grid gap-6'>
      <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm'>
        <dt>
          <code className='font-mono text-strong'>DEFAULT_ACCENT_COLOR</code>
        </dt>
        <dd data-slot='default-accent' className='text-subtle'>
          {DEFAULT_ACCENT_COLOR}
        </dd>
        {parameters.map(({ name, value }) => (
          <div key={name} className='contents'>
            <dt>
              <code className='font-mono text-strong'>{name}</code>
            </dt>
            <dd
              data-slot='accent-parameter'
              data-name={name}
              className='text-subtle'
            >
              {value?.light}
            </dd>
          </div>
        ))}
      </dl>
      <ScaleSwatches followingAccent />
    </div>
  )
}
