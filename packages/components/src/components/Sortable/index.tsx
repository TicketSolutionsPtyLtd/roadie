// No 'use client': dot access must work from server components.
import { SortableDropZone } from './SortableDropZone'
import { SortableHandleLazy } from './SortableHandleLazy'
import { SortableItem } from './SortableItem'
import { SortableRoot } from './SortableRoot'

const Sortable = SortableRoot as typeof SortableRoot & {
  Root: typeof SortableRoot
  Item: typeof SortableItem
  Handle: typeof SortableHandleLazy
  DropZone: typeof SortableDropZone
}

Sortable.Root = SortableRoot
Sortable.Item = SortableItem
Sortable.Handle = SortableHandleLazy
Sortable.DropZone = SortableDropZone

export { Sortable }
export type {
  SortableRootProps as SortableProps,
  SortableMove,
  SortableTransfer
} from './SortableRoot'
export type { SortableDropZoneProps } from './SortableDropZone'
export type { SortableItemProps } from './SortableItem'
export type { SortableHandleProps } from './SortableHandle'
export {
  sortableItemVariants,
  sortableDropIndicatorVariants,
  sortableHandleVariants,
  sortableDropZoneVariants
} from './variants'
