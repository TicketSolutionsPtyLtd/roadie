import { useSyncExternalStore } from 'react'

export type Grouped = { group?: string }

/**
 * The items with each group gathered where it first appears, so the arrow
 * keys, which step through the flat list, follow the headings.
 */
export function inGroupOrder<Item extends Grouped>(items: readonly Item[]) {
  const order = [...new Set(items.map((item) => item.group))]
  return [...items].sort(
    (a, b) => order.indexOf(a.group) - order.indexOf(b.group)
  )
}

const TOUCH_QUERY = '(pointer: coarse)'

function subscribeToTouch(onChange: () => void) {
  const query = window.matchMedia(TOUCH_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const hasKeys = () => !window.matchMedia(TOUCH_QUERY).matches
const keysOnServer = () => true

/**
 * Whether a menu shows its items' key shortcuts: not on a touch screen, which
 * has no keys to press them with.
 */
export const useShowsShortcuts = () =>
  useSyncExternalStore(subscribeToTouch, hasKeys, keysOnServer)
