import type { RecordCardParts } from './types'

/**
 * A layout's row height, in one place: the rem a window counts by and the
 * class that draws it. Classes are full literals for Tailwind's scanner.
 */
export type RowSize = {
  /** Each row's height, or its estimate when the window measures rows. */
  estimateRem: number
  heightClass: string
  /** Rows size to their content, so the window measures each one. */
  measure?: boolean
  gapRem?: number
  gapClass?: string
}

export const tableRowSize: RowSize = { estimateRem: 3, heightClass: 'h-12' }

export const listRowSize = (parts: RecordCardParts): RowSize =>
  parts.description
    ? { estimateRem: 4, heightClass: 'h-16' }
    : { estimateRem: 3, heightClass: 'h-12' }

export const cardGap = { gapRem: 0.75, gapClass: 'gap-3' }

/** What a 16:9 banner adds on a phone. */
const BANNER_REM = 12.5

/** `heightClass` sizes the card's body; a banner sits above it. */
export const cardSize = (banner: boolean): RowSize => ({
  estimateRem: 10 + (banner ? BANNER_REM : 0),
  heightClass: 'h-40',
  measure: true,
  ...cardGap
})

/** Between grid cards, both ways. */
export const gridGap = { gapRem: 1, gapClass: 'gap-4' }

/** A grid row of cards; a banner adds less than on a phone, as grid cards are narrower. */
export const gridRowSize = (banner: boolean): RowSize => ({
  estimateRem: 10 + (banner ? 9 : 0),
  heightClass: cardSize(banner).heightClass,
  measure: true,
  ...gridGap
})
