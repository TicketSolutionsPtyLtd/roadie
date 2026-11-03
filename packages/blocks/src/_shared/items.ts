import { cn } from '@oztix/roadie-core/utils'

import {
  type BlockIntent,
  type ItemEmphasis,
  type SurfaceEmphasis,
  emphasisClass,
  intentClass,
  isFilled
} from './surface'

type Item = { href?: string; intent?: BlockIntent }

// A linked item with no surface takes subtler, so its hover has somewhere to show.
export const itemSurface = (
  item: Item,
  itemEmphasis: ItemEmphasis | undefined
) => itemEmphasis ?? (item.href ? 'subtler' : undefined)

/** On a filled block, the intent an opaque item sets again, which brings back the page's text colours over its own surface. */
export const filledIntent = (
  blockIntent: BlockIntent | undefined,
  blockEmphasis: SurfaceEmphasis | undefined
): BlockIntent | undefined =>
  isFilled(blockEmphasis) ? (blockIntent ?? 'neutral') : undefined

/** The intent an item's surface sets: its own, or on an opaque surface, the filled block's. Tinted surfaces let the fill and its text colour through. */
export const itemIntent = (
  item: Item,
  surface: ItemEmphasis | undefined,
  filled: BlockIntent | undefined
): BlockIntent | undefined =>
  item.intent ??
  (surface === 'normal' || surface === 'raised' ? filled : undefined)

/** An item in its own markup on Card's surfaces, padded as Card.Content pads one. */
export function itemSurfaceClass(
  item: Item,
  itemEmphasis: ItemEmphasis | undefined,
  filled: BlockIntent | undefined
) {
  const surface = itemSurface(item, itemEmphasis)
  return cn(
    'is-interactive-within min-w-0',
    intentClass(itemIntent(item, surface, filled)),
    emphasisClass(surface),
    surface === 'subtler' ? '-m-2 p-2' : surface && 'px-6 py-4'
  )
}

/** An item's mark: in its own intent, then the block's, then the fallback. */
export const markIntent = (
  item: Item,
  blockIntent: BlockIntent | undefined,
  fallback: BlockIntent
): BlockIntent => item.intent ?? blockIntent ?? fallback

const MARK_CYCLE = ['info', 'brand', 'brand-secondary'] as const

/** An item's mark as `markIntent`, falling back to info, brand, and brand-secondary in turn. */
export const cycledMarkIntent = (
  item: Item,
  blockIntent: BlockIntent | undefined,
  index: number
): BlockIntent =>
  markIntent(item, blockIntent, MARK_CYCLE[index % MARK_CYCLE.length]!)
