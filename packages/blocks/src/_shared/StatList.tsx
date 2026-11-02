import type { CSSProperties } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { SPOT_ILLUSTRATIONS, type SpotIllustrationName } from './illustrations'

export type StatItem = {
  /** The number as written, such as `7 million+` or `4.9 out of 5`. Over four words, it's set a step smaller. */
  value: string
  /** What the number counts, such as `tickets sold`. */
  label: string
  illustration?: SpotIllustrationName
}

// A figure, such as `7 million+` or `4.9 out of 5`, is at most four words; more is a phrase, set smaller so it fits.
const isPhrase = (value: string) => value.trim().split(/\s+/).length > 4

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

// Four or three to a row, whichever fills the last row more, so five or six sit
// three to a row and seven four, and no row ends with one alone.
const mostPerRow = (count: number) => {
  if (count <= 4) return 4
  const lastRowFill = (perRow: number) => (count % perRow || perRow) / perRow
  return lastRowFill(4) >= lastRowFill(3) ? 4 : 3
}

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
          <li key={`${index}-${value}-${label}`} className='@container min-w-0'>
            {/* The column's width, the same across a row, decides whether the
                illustration sits beside the figure or above it, never the text. */}
            <div className='grid justify-items-start gap-2 py-1 @xs:flex @xs:items-center @xs:gap-4'>
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
            </div>
          </li>
        )
      })}
    </ul>
  )
}
