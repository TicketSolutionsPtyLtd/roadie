import { cn } from '@oztix/roadie-core/utils'

import {
  type BlockIntent,
  type ItemEmphasis,
  emphasisClass,
  intentClass
} from './surface'

type Item = { href?: string; intent?: BlockIntent }

// A linked item with no surface takes subtler, so its hover has somewhere to show.
export const itemSurface = (
  item: Item,
  itemEmphasis: ItemEmphasis | undefined
) => itemEmphasis ?? (item.href ? 'subtler' : undefined)

/** An item in its own markup on Card's surfaces, padded as Card.Content pads one. */
export function itemSurfaceClass(
  item: Item,
  itemEmphasis: ItemEmphasis | undefined
) {
  const surface = itemSurface(item, itemEmphasis)
  return cn(
    'is-interactive-within min-w-0',
    intentClass(item.intent),
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
