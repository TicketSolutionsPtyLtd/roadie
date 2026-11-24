import type { CSSProperties } from 'react'

import { cn } from '@oztix/roadie-core/utils'

/**
 * Cards drawn before the columns are measured. A window always draws at least
 * this many (it adds ten rows beyond the screen), so none is ever removed.
 */
export const FIRST_CARDS = 10

/** The column counts the filler tells apart; a wider grid reads as this many. */
const MAX_COLUMNS = 12

/**
 * The grid rows the rest of the records take past the first cards' own, for
 * each count of columns from one.
 */
export function fillerRows(records: number) {
  return Array.from({ length: MAX_COLUMNS }, (_, at) => {
    const columns = at + 1
    const rows = Math.ceil(records / columns) - Math.ceil(FIRST_CARDS / columns)
    return Math.max(1, rows)
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

/**
 * The grid's own classes while its columns are unmeasured. The filler asks its
 * width, and every row is as tall as the tallest card, so the rows it spans
 * are as tall as the ones drawn.
 */
export const UNMEASURED_CLASS = '@container/grid auto-rows-fr'

/**
 * Stands in for the cards not drawn until the browser has measured the grid's
 * columns. How many columns CSS lays out depends on the width, so the rows the
 * filler spans do too, through a container query on the grid. The page is as
 * tall as it will be on the first paint, never a one-column guess to correct.
 */
export function GridFiller({ records }: { records: number }) {
  const style = Object.fromEntries(
    fillerRows(records).map((rows, at) => [`--fill-${at + 1}`, String(rows)])
  )
  return (
    <li
      aria-hidden='true'
      className={cn(
        'col-span-full [grid-row:span_var(--fill)] [--fill:var(--fill-1)]',
        byWidth
      )}
      style={style as CSSProperties}
    />
  )
}
