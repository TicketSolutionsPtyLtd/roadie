import type { CSSProperties } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import type { RowSize } from '../Records/rowSizing'

/**
 * Cards drawn before the columns are measured. A window always draws at least
 * this many (it adds ten rows beyond the screen), so none is ever removed.
 */
export const FIRST_CARDS = 10

/** The column counts the filler tells apart; a wider grid reads as this many. */
const MAX_COLUMNS = 12

type RowRem = Pick<RowSize, 'estimateRem' | 'gapRem'>

/**
 * The rem that fills the rows past the first cards, for each count of columns
 * from one: the rows the rest of the records take, less the first cards' own,
 * less the gap above the filler. -1 is "none", and the gap to take back.
 */
export function fillerRems(
  records: number,
  { estimateRem, gapRem = 0 }: RowRem
) {
  return Array.from({ length: MAX_COLUMNS }, (_, at) => {
    const columns = at + 1
    const rows = Math.ceil(records / columns) - Math.ceil(FIRST_CARDS / columns)
    return rows * (estimateRem + gapRem) - gapRem
  })
}

// Whole literals, for Tailwind's scanner. n columns of `auto-fill, minmax(16rem,
// 1fr)` start at n cards and n - 1 gaps (1rem) wide.
const byWidth = [
  '@min-[33rem]/grid:[--fill:var(--fill-2)]',
  '@min-[50rem]/grid:[--fill:var(--fill-3)]',
  '@min-[67rem]/grid:[--fill:var(--fill-4)]',
  '@min-[84rem]/grid:[--fill:var(--fill-5)]',
  '@min-[101rem]/grid:[--fill:var(--fill-6)]',
  '@min-[118rem]/grid:[--fill:var(--fill-7)]',
  '@min-[135rem]/grid:[--fill:var(--fill-8)]',
  '@min-[152rem]/grid:[--fill:var(--fill-9)]',
  '@min-[169rem]/grid:[--fill:var(--fill-10)]',
  '@min-[186rem]/grid:[--fill:var(--fill-11)]',
  '@min-[203rem]/grid:[--fill:var(--fill-12)]'
]

/** The grid's own class while its columns are unmeasured: the filler asks its width. */
export const UNMEASURED_CLASS = '@container/grid'

/**
 * Stands in for the cards not drawn until the browser has measured the grid's
 * columns. How many columns CSS lays out depends on the width, so the filler's
 * height does too, through a container query on the grid. The page is as tall
 * as it will be on the first paint, never a one-column guess to correct.
 */
export function GridFiller({ records, row }: { records: number; row: RowRem }) {
  const style = Object.fromEntries(
    fillerRems(records, row).map((rem, at) => [`--fill-${at + 1}`, `${rem}rem`])
  )
  return (
    <li
      aria-hidden='true'
      data-slot='record-grid-filler'
      // A negative fill is the gap taken back, not a negative height.
      className={cn(
        'col-span-full h-[max(0rem,var(--fill))] mt-[min(0rem,var(--fill))] [--fill:var(--fill-1)]',
        byWidth
      )}
      style={style as CSSProperties}
    />
  )
}
