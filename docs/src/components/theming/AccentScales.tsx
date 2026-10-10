import { ScaleSwatches } from '@/components/colors/ScaleSwatches'
import { accentDefaults } from '@/lib/foundation-scales'
import { getTokens } from '@/lib/tokens'

import { DEFAULT_ACCENT_COLOR } from '@oztix/roadie-core/theme'

/** The accent parameters with their defaults, then the scales they drive, live in the current theme. */
export async function AccentScales() {
  const defaults = accentDefaults(await getTokens(), DEFAULT_ACCENT_COLOR)

  return (
    <div data-not-prose data-slot='accent-scales' className='grid gap-6'>
      <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm'>
        {defaults.map(({ name, value, fromToken }) => (
          <div key={name} data-twin-row className='contents'>
            <dt>
              <code data-twin-cell className='font-mono text-strong'>
                {name}
              </code>
            </dt>
            <dd
              data-slot={fromToken ? 'accent-parameter' : 'default-accent'}
              data-name={fromToken ? name : undefined}
              data-twin-cell
              className='text-subtle'
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <ScaleSwatches followingAccent />
    </div>
  )
}
