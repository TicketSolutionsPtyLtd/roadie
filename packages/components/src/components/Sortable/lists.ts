// Framework-free: the lists in each group, so a Move menu can offer the others.
import type { SortableSource } from './dnd'

export type SortableList = {
  /** The list's name in the Move menu, as in "Move SKU to done". */
  name: () => string
  /** The set of lists it sits in, such as a board lane, from its `section`. */
  section: () => string | undefined
  /** Whether it would take the item. */
  takes: (source: SortableSource) => boolean
  /** Lands the item at the end of this list, and says where it went; null when it refuses it. */
  receive: (source: SortableSource) => string | null
}

const groups = new Map<string, Set<SortableList>>()

export function joinGroup(group: string, list: SortableList) {
  const lists = groups.get(group) ?? new Set()
  groups.set(group, lists.add(list))
  return () => {
    lists.delete(list)
    if (lists.size === 0 && groups.get(group) === lists) groups.delete(group)
  }
}

/** The other lists in the group that would take the item, in mount order. */
export function otherLists(
  group: string,
  self: SortableList,
  source: SortableSource
) {
  return Array.from(groups.get(group) ?? []).filter(
    (list) => list !== self && list.takes(source)
  )
}
