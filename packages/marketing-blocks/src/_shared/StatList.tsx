import { cn } from '@oztix/roadie-core/utils'

import { SPOT_ILLUSTRATIONS, type SpotIllustrationName } from './illustrations'

export type StatItem = {
  /** The number as written, such as `7 million+`. */
  value: string
  /** What the number counts, such as `tickets sold`. */
  label: string
  illustration?: SpotIllustrationName
}

// A figure with a unit, such as `7 million+`, is at most two words; more is a phrase, set smaller so it fits.
const isPhrase = (value: string) => value.trim().split(/\s+/).length > 2

/** The stats in a wrapping grid, each an illustration, a large value, and its label. */
export function StatList({ items }: { items: readonly StatItem[] }) {
  return (
    <ul className='grid grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),1fr))] gap-x-8 gap-y-2'>
      {items.map(({ value, label, illustration }, index) => {
        const Illustration = illustration && SPOT_ILLUSTRATIONS[illustration]
        return (
          <li
            key={`${index}-${value}-${label}`}
            className='flex min-w-0 items-center gap-4 py-1'
          >
            {Illustration && (
              <Illustration outline className='size-16 shrink-0' />
            )}
            <div>
              <p
                className={cn(
                  'text-strong',
                  isPhrase(value) ? 'text-display-ui-4' : 'text-display-ui-3'
                )}
              >
                {value}
              </p>
              <p className='text-subtle'>{label}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
