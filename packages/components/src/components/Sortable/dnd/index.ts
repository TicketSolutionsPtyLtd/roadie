// With file.ts, the only module that imports the drag library, so it can be
// swapped here.
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

/**
 * Ties items to their list, and lists that share a group to each other, so a
 * drag never lands in a list outside its group.
 */
export type SortableGroup = {
  shared: object | string
  /** Holds the items its list has disabled, which other lists read too. */
  list: { locked: ReadonlySet<string> }
  value?: string
}

type Cleanup = () => void

const GROUP = 'roadieSortableGroup'
const LIST = 'roadieSortableList'
const LIST_VALUE = 'roadieSortableListValue'
const VALUE = 'roadieSortableValue'
const LABEL = 'roadieSortableLabel'

type Payload = Record<string | symbol, unknown>

/** The dragged item, as a list sees it. */
export type SortableSource = {
  value: string
  label?: string
  /** The value of the list it comes from. */
  list?: string
  sameList: boolean
  /** Disabled since the drag began, so its drop is ignored. */
  locked?: boolean
}

const inGroup = (data: Payload, group: SortableGroup) =>
  data[GROUP] === group.shared

const sourceOf = (data: Payload, group: SortableGroup): SortableSource => ({
  value: data[VALUE] as string,
  label: data[LABEL] as string | undefined,
  list: data[LIST_VALUE] as string | undefined,
  sameList: data[LIST] === group.list,
  locked: (data[LIST] as SortableGroup['list']).locked.has(
    data[VALUE] as string
  )
})

const edgesFor = (axis: SortableAxis): Edge[] =>
  axis === 'vertical' ? ['top', 'bottom'] : ['left', 'right']

export function createSortableGroup(
  shared?: string,
  value?: string,
  list: SortableGroup['list'] = { locked: new Set() }
): SortableGroup {
  return { shared: shared ?? {}, list, value }
}

export function sortableItemData(
  group: SortableGroup,
  value?: string,
  label?: string
): Payload {
  return {
    [GROUP]: group.shared,
    [LIST]: group.list,
    [LIST_VALUE]: group.value,
    [VALUE]: value,
    [LABEL]: label
  }
}

export type SortableDropTargetOptions = {
  element: HTMLElement
  group: SortableGroup
  value: string
  axis: SortableAxis
  onDropEdgeChange: (edge: SortableEdge | null) => void
  /** False hides an edge whose drop would leave the order as it is. */
  movesTo: (source: SortableSource, edge: SortableEdge) => boolean
  /** False refuses an item, such as one from a list this one turns down. */
  accepts: (source: SortableSource) => boolean
}

/** Takes drops from the group's items, whether or not this one can drag. */
export function sortableDropTarget({
  element,
  group,
  value,
  axis,
  onDropEdgeChange,
  movesTo,
  accepts
}: SortableDropTargetOptions): Cleanup {
  const data = sortableItemData(group, value)
  const showEdge = ({
    self,
    source
  }: {
    self: { data: Payload }
    source: { data: Payload }
  }) => {
    const edge = extractClosestEdge(self.data)
    const from = sourceOf(source.data, group)
    onDropEdgeChange(
      edge && (!from.sameList || from.value !== value) && movesTo(from, edge)
        ? edge
        : null
    )
  }
  return dropTargetForElements({
    element,
    canDrop: ({ source }) =>
      inGroup(source.data, group) && accepts(sourceOf(source.data, group)),
    getData: ({ input }) =>
      attachClosestEdge(data, { input, element, allowedEdges: edgesFor(axis) }),
    onDragEnter: showEdge,
    onDrag: showEdge,
    onDragLeave: () => onDropEdgeChange(null),
    onDrop: () => onDropEdgeChange(null)
  })
}

export type SortableDropZoneOptions = {
  element: HTMLElement
  group: SortableGroup
  axis: SortableAxis
  accepts: (source: SortableSource) => boolean
  onActiveChange: (active: boolean) => void
}

/** Takes items from other lists past or without this list's own items. */
export function sortableDropZone({
  element,
  group,
  axis,
  accepts,
  onActiveChange
}: SortableDropZoneOptions): Cleanup {
  const data = sortableItemData(group)
  const takes = (source: { data: Payload }) => {
    if (!inGroup(source.data, group)) return false
    const from = sourceOf(source.data, group)
    return !from.sameList && accepts(from)
  }
  let stopScrolling: Cleanup = () => {}
  return combine(
    // The list the drag started in scrolls the containers they share.
    monitorForElements({
      canMonitor: ({ source }) => takes(source),
      onDragStart: ({ source }) => {
        stopScrolling = autoScrollAncestors(
          element,
          group,
          axis,
          source.element
        )
      },
      onDrop: () => stopScrolling()
    }),
    () => stopScrolling(),
    dropTargetForElements({
      element,
      canDrop: ({ source }) => takes(source),
      getData: () => data,
      onDragEnter: () => onActiveChange(true),
      onDragLeave: () => onActiveChange(false),
      onDrop: () => onActiveChange(false)
    })
  )
}

export type SortableDraggableOptions = {
  element: HTMLElement
  /** Left out, the item drags from anywhere on it. */
  handle?: HTMLElement
  group: SortableGroup
  value: string
  label?: string
  onDraggingChange: (dragging: boolean) => void
}

/** Drags the item by its handle, or from anywhere on it without one. */
export function sortableDraggable({
  element,
  handle,
  group,
  value,
  label,
  onDraggingChange
}: SortableDraggableOptions): Cleanup {
  const data = sortableItemData(group, value, label)
  // Without a handle: whether the press began on a control inside the item.
  let onControl = false
  const drag = draggable({
    element,
    dragHandle: handle,
    // A control's own press wins, such as a menu that opens on pointerdown.
    canDrag: () => !onControl,
    getInitialData: () => data,
    onDragStart: () => onDraggingChange(true),
    onDrop: () => onDraggingChange(false)
  })
  if (handle) return drag
  // A link or image inside drags itself, which the item ignores, so a press
  // on one hands the drag to the item until the next press. Clicks still
  // follow the link.
  const lent = new Set<HTMLElement>()
  const giveBack = () => {
    for (const inner of lent) inner.removeAttribute('draggable')
    lent.clear()
  }
  const press = (event: PointerEvent) => {
    giveBack()
    const target = event.target instanceof Element ? event.target : null
    onControl = Boolean(
      target?.closest(CONTROLS) &&
      !target.closest('[data-slot="sortable-handle"]')
    )
    for (const selector of ['a[href]', 'img']) {
      const inner = target?.closest<HTMLElement>(selector)
      if (!inner || !element.contains(inner) || inner.hasAttribute('draggable'))
        continue
      inner.draggable = false
      lent.add(inner)
    }
  }
  element.addEventListener('pointerdown', press, { capture: true })
  return () => {
    drag()
    element.removeEventListener('pointerdown', press, { capture: true })
    giveBack()
  }
}

const CONTROLS =
  'button, input, select, textarea, [contenteditable=""], [contenteditable="true"], [role="menuitem"]'

/** A drop on one of this list's items, or on its drop zone (`target: null`). */
export type SortableDrop =
  | { source: SortableSource; target: string; edge: SortableEdge }
  | { source: SortableSource; target: null; edge: null }

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
        // Every list in a shared group sees the drag; one scrolls for it.
        if (!sourceOf(source.data, group).sameList) return
        stopScrolling = combine(
          autoScrollWindowForElements({
            canScroll: ({ source }) => inGroup(source.data, group),
            getAllowedAxis: () => axis
          }),
          autoScrollAncestors(source.element.parentElement, group, axis)
        )
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
 * The drop for this list. Targets run innermost first, and the innermost can
 * belong to another drag feature, a nested Sortable or another list in the
 * group, so it may not be ours.
 */
export function sortableDropFrom(
  targets: readonly { data: Payload }[],
  source: { data: Payload },
  group: SortableGroup
): SortableDrop | null {
  const target = targets.find(({ data }) => inGroup(data, group))
  if (!target || target.data[LIST] !== group.list) return null
  const from = sourceOf(source.data, group)
  const value = target.data[VALUE] as string | undefined
  if (value === undefined) return { source: from, target: null, edge: null }
  const edge = extractClosestEdge(target.data)
  return edge ? { source: from, target: value, edge } : null
}

// Registered when a drag starts, so containers that became scrollable after
// mount (a popover that opened, a list that grew) still scroll.
function autoScrollAncestors(
  first: Element | null,
  group: SortableGroup,
  axis: SortableAxis,
  until?: Element
): Cleanup {
  const overflow = axis === 'vertical' ? 'overflowY' : 'overflowX'
  const canScroll = ({ source }: { source: { data: Payload } }) =>
    inGroup(source.data, group)
  const cleanups: Cleanup[] = []
  for (
    let node = first;
    node && node !== document.documentElement && !node.contains(until ?? null);
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
