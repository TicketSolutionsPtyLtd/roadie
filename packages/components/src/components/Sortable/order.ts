// Framework-free ordering rules, shared by the React parts and any other skin.

export type SortableAxis = 'vertical' | 'horizontal'
export type SortableEdge = 'top' | 'bottom' | 'left' | 'right'
export type TextDirection = 'ltr' | 'rtl'

export type MoveDirection =
  'up' | 'down' | 'top' | 'bottom' | 'left' | 'right' | 'start' | 'end'

export type MenuMove = {
  direction: MoveDirection
  /** Index the item lands on. */
  to: number
  disabled: boolean
}

export function moveItem<T>(items: readonly T[], from: number, to: number) {
  const next = [...items]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

/** The index the dragged item lands on once it leaves `from`. */
export function dropIndex({
  from,
  target,
  edge,
  axis,
  dir
}: {
  from: number
  target: number
  edge: SortableEdge
  axis: SortableAxis
  dir: TextDirection
}) {
  const startEdge =
    axis === 'vertical' ? 'top' : dir === 'rtl' ? 'right' : 'left'
  const insertAt = edge === startEdge ? target : target + 1
  return from < insertAt ? insertAt - 1 : insertAt
}

export function menuMoves({
  index,
  total,
  axis,
  dir
}: {
  index: number
  total: number
  axis: SortableAxis
  dir: TextDirection
}): MenuMove[] {
  const last = total - 1
  const [earlier, later, first, final]: [
    MoveDirection,
    MoveDirection,
    MoveDirection,
    MoveDirection
  ] =
    axis === 'vertical'
      ? ['up', 'down', 'top', 'bottom']
      : dir === 'rtl'
        ? ['right', 'left', 'start', 'end']
        : ['left', 'right', 'start', 'end']
  return [
    { direction: earlier, to: index - 1, disabled: index <= 0 },
    { direction: later, to: index + 1, disabled: index >= last },
    { direction: first, to: 0, disabled: index <= 0 },
    { direction: final, to: last, disabled: index >= last }
  ]
}

const ENDS: MoveDirection[] = ['top', 'bottom', 'start', 'end']

export function reorderLabel(direction: MoveDirection, name?: string) {
  const where = ENDS.includes(direction) ? `to ${direction}` : direction
  return name ? `Move ${name} ${where}` : `Move ${where}`
}

export function handleLabel(name?: string) {
  return name ? `Reorder ${name}` : 'Reorder'
}

export function moveAnnouncement({
  name,
  to,
  total,
  collection
}: {
  name?: string
  to: number
  total: number
  collection?: string
}) {
  const where = `to position ${to + 1} of ${total}${collection ? ` ${collection}` : ''}`
  return name ? `${name} moved ${where}` : `Moved ${where}`
}
