import { useMediaQuery } from './toolbarMode'

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

/**
 * Whether a menu shows its items' key shortcuts: only with a mouse or
 * trackpad, as a touch screen alone has no keys to press them with.
 */
export const useShowsShortcuts = () =>
  useMediaQuery('(any-pointer: fine)', true)
