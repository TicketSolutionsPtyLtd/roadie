// The only module that imports the drag library, so it can be swapped here.
// Framework-free: React (and any Vue skin) wires DOM elements and callbacks in.
import {
  autoScrollForElements,
  autoScrollWindowForElements
} from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import {
  draggable,
  dropTargetForElements,
  monitorForElements
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'

import type { SortableAxis, SortableEdge } from '../order'

/** Ties items to one sortable, so a drag never lands in another. */
export type SortableGroup = object

type Cleanup = () => void

const GROUP = 'roadieSortableGroup'
const VALUE = 'roadieSortableValue'

type Payload = Record<string | symbol, unknown>

const inGroup = (data: Payload, group: SortableGroup) => data[GROUP] === group

const edgesFor = (axis: SortableAxis): Edge[] =>
  axis === 'vertical' ? ['top', 'bottom'] : ['left', 'right']

export function createSortableGroup(): SortableGroup {
  return {}
}

export function sortableItemData(group: SortableGroup, value: string): Payload {
  return { [GROUP]: group, [VALUE]: value }
}

export type SortableItemOptions = {
  element: HTMLElement
  handle: HTMLElement
  group: SortableGroup
  value: string
  axis: SortableAxis
  /** False skips the drag; the item still takes drops. */
  draggable: boolean
  onDraggingChange: (dragging: boolean) => void
  onDropEdgeChange: (edge: SortableEdge | null) => void
  /** False hides an edge whose drop would leave the order as it is. */
  movesTo: (source: string, edge: SortableEdge) => boolean
}

export function sortableItem({
  element,
  handle,
  group,
  value,
  axis,
  draggable: canDrag,
  onDraggingChange,
  onDropEdgeChange,
  movesTo
}: SortableItemOptions): Cleanup {
  const data = sortableItemData(group, value)
  const showEdge = ({
    self,
    source
  }: {
    self: { data: Payload }
    source: { data: Payload }
  }) => {
    const edge = extractClosestEdge(self.data)
    const sourceValue = source.data[VALUE] as string
    onDropEdgeChange(
      edge && sourceValue !== value && movesTo(sourceValue, edge) ? edge : null
    )
  }
  const target = dropTargetForElements({
    element,
    canDrop: ({ source }) => inGroup(source.data, group),
    getData: ({ input }) =>
      attachClosestEdge(data, { input, element, allowedEdges: edgesFor(axis) }),
    onDragEnter: showEdge,
    onDrag: showEdge,
    onDragLeave: () => onDropEdgeChange(null),
    onDrop: () => onDropEdgeChange(null)
  })
  if (!canDrag) return target
  return combine(
    target,
    draggable({
      element,
      dragHandle: handle,
      getInitialData: () => data,
      onDragStart: () => onDraggingChange(true),
      onDrop: () => onDraggingChange(false)
    })
  )
}

export type SortableDrop = { value: string; target: string; edge: SortableEdge }

export type SortableMonitorOptions = {
  group: SortableGroup
  axis: SortableAxis
  onDragStart?: () => void
  onDrop: (drop: SortableDrop) => void
}

export function sortableMonitor({
  group,
  axis,
  onDragStart,
  onDrop
}: SortableMonitorOptions): Cleanup {
  let stopScrolling: Cleanup = () => {}
  return combine(
    monitorForElements({
      canMonitor: ({ source }) => inGroup(source.data, group),
      onDragStart: ({ source }) => {
        stopScrolling = autoScrollAncestors(source.element, group, axis)
        onDragStart?.()
      },
      onDrop: ({ source, location }) => {
        stopScrolling()
        const drop = sortableDropFrom(
          location.current.dropTargets,
          source,
          group
        )
        if (drop) onDrop(drop)
      }
    }),
    () => stopScrolling()
  )
}

/**
 * The drop for this group. Targets run innermost first, and the innermost can
 * belong to another drag feature or a nested Sortable, so it may not be ours.
 */
export function sortableDropFrom(
  targets: readonly { data: Payload }[],
  source: { data: Payload },
  group: SortableGroup
): SortableDrop | null {
  const target = targets.find(({ data }) => inGroup(data, group))
  const edge = target ? extractClosestEdge(target.data) : null
  if (!target || !edge) return null
  return {
    value: source.data[VALUE] as string,
    target: target.data[VALUE] as string,
    edge
  }
}

// Registered when a drag starts, so containers that became scrollable after
// mount (a popover that opened, a list that grew) still scroll.
function autoScrollAncestors(
  element: Element,
  group: SortableGroup,
  axis: SortableAxis
): Cleanup {
  const overflow = axis === 'vertical' ? 'overflowY' : 'overflowX'
  const canScroll = ({ source }: { source: { data: Payload } }) =>
    inGroup(source.data, group)
  const cleanups: Cleanup[] = [
    autoScrollWindowForElements({ canScroll, getAllowedAxis: () => axis })
  ]
  for (
    let node = element.parentElement;
    node && node !== document.documentElement;
    node = node.parentElement
  ) {
    const style = getComputedStyle(node)
    if (style[overflow] !== 'auto' && style[overflow] !== 'scroll') continue
    cleanups.push(
      autoScrollForElements({
        element: node,
        canScroll,
        getAllowedAxis: () => axis
      })
    )
  }
  return combine(...cleanups)
}
