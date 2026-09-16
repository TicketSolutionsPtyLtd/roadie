import { Children, type ReactNode, isValidElement } from 'react'

import type {
  PaneExit,
  PanePlace,
  PaneStackContextValue
} from '../Pane/PaneStackContext'

/** One child of `Navigator.Content`, under the key React reconciles it by. */
export type PaneSlot = { key: string; node: ReactNode }

/** A slot the row draws after React stopped: the subtree that was on screen, not a copy. */
export type HeldSlot = PaneSlot & {
  exit: PaneExit
  /** Where it sat, so it is redrawn in place and its element never moves. */
  at: number
  stack: PaneStackContextValue
}

// `Children.toArray` numbers by position in the original children, so a slot
// that empties does not renumber the ones that stay, and an explicit key is
// used as given. A slot that keeps its key keeps its fiber and its DOM.
export function slotsOf(children: ReactNode): PaneSlot[] {
  return Children.toArray(children).map((node, index) => ({
    key: isValidElement(node) ? String(node.key ?? index) : String(index),
    node
  }))
}

/** The slots `now` has stopped drawing, in the order `was` held them. */
export function departed(
  was: readonly PaneSlot[],
  now: readonly PaneSlot[]
): (PaneSlot & { at: number })[] {
  const drawn = new Set(now.map((slot) => slot.key))
  return was.flatMap((slot, at) =>
    drawn.has(slot.key) ? [] : [{ ...slot, at }]
  )
}

/**
 * The live slots with the held ones back in the places they had, so no element
 * moves: a pane on its way out would restart its slide if the row re-ordered it.
 */
export function drawnSlots(
  slots: readonly PaneSlot[],
  held: readonly HeldSlot[]
): (PaneSlot | HeldSlot)[] {
  const drawn: (PaneSlot | HeldSlot)[] = [...slots]
  for (const slot of [...held].sort((a, b) => a.at - b.at)) {
    drawn.splice(Math.min(slot.at, drawn.length), 0, slot)
  }
  return drawn
}

const nothing = () => {}

/** What a held slot keeps of the row it left, none of it read again. */
export type HeldFrom = Pick<
  PaneStackContextValue,
  'placeOf' | 'moreOpen' | 'level' | 'destination'
>

/**
 * The stack a held slot reads: out of the register, so the live row's depths
 * ignore it, and holding the place it had, taken while it is still in the stack,
 * so it goes out at the depth and with the chrome it arrived with. The
 * destination is the one it left on, so it never scrolls itself back to the top.
 */
export function heldStack(
  from: HeldFrom,
  exit: PaneExit
): PaneStackContextValue {
  const places = new Map<string, PanePlace>()
  return {
    moreOpen: from.moreOpen,
    level: from.level,
    destination: from.destination,
    register: nothing,
    unregister: nothing,
    markPushing: nothing,
    placeOf: (id, entry) => {
      const known = places.get(id)
      if (known) return known
      const place = { ...from.placeOf(id, entry), exit }
      places.set(id, place)
      return place
    }
  }
}
