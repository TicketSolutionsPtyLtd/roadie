import type { CSSProperties } from 'react'

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

// A line may break before a sign after a number, so `33,000,000+` could leave its `+`
// alone on a line. Each word holds together, so a value breaks only between words.
const keepWords = (value: string) =>
  value
    .trim()
    .split(/(\s+)/)
    .map((part, index) =>
      index % 2 ? (
        part
      ) : (
        <span key={index} className='whitespace-nowrap'>
          {part}
        </span>
      )
    )

// Five or six stats sit three to a row, so no row ends with one alone.
const mostPerRow = (count: number) => (count > 4 ? 3 : 4)

/** The stats in a wrapping grid, each an illustration, a large value, and its label. */
export function StatList({ items }: { items: readonly StatItem[] }) {
  return (
    <ul
      style={{ '--stats-per-row': mostPerRow(items.length) } as CSSProperties}
      className='grid grid-cols-[repeat(auto-fill,minmax(min(100%,max(16rem,calc((100%-(var(--stats-per-row)-1)*2rem)/var(--stats-per-row)))),1fr))] gap-x-8 gap-y-2'
    >
      {items.map(({ value, label, illustration }, index) => {
        const Illustration = illustration && SPOT_ILLUSTRATIONS[illustration]
        return (
          <li
            key={`${index}-${value}-${label}`}
            // A figure too wide to sit beside its illustration goes under it.
            className='flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 py-1'
          >
            {Illustration && (
              <Illustration outline className='size-16 shrink-0' />
            )}
            <div className='min-w-0'>
              <p
                className={cn(
                  'text-strong',
                  isPhrase(value) ? 'text-display-ui-4' : 'text-display-ui-3'
                )}
              >
                {keepWords(value)}
              </p>
              <p className='text-subtle'>{label}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
