import { Children, type ReactNode, isValidElement } from 'react'

import type {
  PaneExit,
  PanePlace,
  PaneStackContextValue
} from '../Pane/PaneStackContext'

/** One child of `Navigator.Content`, under the key React reconciles it by. */
export type PaneSlot = { key: string; node: ReactNode }

/** A slot the row keeps drawing while its pane slides out. */
export type HeldSlot = PaneSlot & {
  exit: PaneExit
  at: number
  stack: PaneStackContextValue
}

// `Children.toArray` numbers by position in the original children, so a slot
// that empties renumbers none of the ones that stay. `step` re-keys them for a
// page-root step, where the route changes the page but not the pane.
export function slotsOf(children: ReactNode, step?: string | null): PaneSlot[] {
  const at = step === null || step === undefined ? '' : `#${step}`
  return Children.toArray(children).map((node, index) => ({
    key: `${isValidElement(node) ? (node.key ?? index) : index}${at}`,
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

// A slot drawn again takes its element back rather than being drawn twice under
// one key. `was` is returned unchanged when nothing moved, so a re-render does
// not restart the wait.
export function mergeHeld(
  was: readonly HeldSlot[],
  gone: readonly HeldSlot[],
  live: readonly PaneSlot[]
): readonly HeldSlot[] {
  const drawn = new Set(live.map((slot) => slot.key))
  const fresh = new Set(gone.map((slot) => slot.key))
  const kept = was.filter(
    (slot) => !drawn.has(slot.key) && !fresh.has(slot.key)
  )
  if (gone.length === 0 && kept.length === was.length) return was
  return [...kept, ...gone]
}

// Held slots go back where they sat: re-ordering the row would restart a slide.
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

/** What a held slot keeps of the row it left. */
export type HeldFrom = Pick<
  PaneStackContextValue,
  'placeOf' | 'moreOpen' | 'level' | 'destination'
>

// Registers nothing, so the live row's depths ignore it, and answers with the
// place taken on the first ask, while the pane is still in the stack.
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
