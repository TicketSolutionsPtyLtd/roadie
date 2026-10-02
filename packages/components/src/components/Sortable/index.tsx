// No 'use client': dot access must work from server components.
import { SortableHandle } from './SortableHandle'
import { SortableItem } from './SortableItem'
import { SortableRoot } from './SortableRoot'

const Sortable = SortableRoot as typeof SortableRoot & {
  Root: typeof SortableRoot
  Item: typeof SortableItem
  Handle: typeof SortableHandle
}

Sortable.Root = SortableRoot
Sortable.Item = SortableItem
Sortable.Handle = SortableHandle

export { Sortable }
export type {
  SortableRootProps as SortableProps,
  SortableMove
} from './SortableRoot'
export type { SortableItemProps } from './SortableItem'
export type { SortableHandleProps } from './SortableHandle'
export {
  sortableItemVariants,
  sortableDropIndicatorVariants,
  sortableHandleVariants
} from './variants'
