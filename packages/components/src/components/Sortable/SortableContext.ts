'use client'

import { type ComponentType, createContext, use } from 'react'

import type { SortableHandleProps } from './SortableHandle'
import type { SortableItemProps } from './SortableItem'
import type { SortableGroup } from './dnd'
import type { SortableAxis, TextDirection } from './order'

export type SortableRootContextValue = {
  items: readonly string[]
  axis: SortableAxis
  dir: TextDirection
  disabled: boolean
  group: SortableGroup
  move: (value: string, to: number, focus: boolean) => void
  /** Records the item's name for announcements; returns its cleanup. */
  nameItem: (value: string, name: string | undefined) => () => void
  /** Moved by the menu; its handle takes focus once it re-renders. */
  takeFocus: (value: string) => boolean
  // Passed through context so `List` can render a sortable row without
  // importing the drag library into every list.
  Item: ComponentType<SortableItemProps>
  Handle: ComponentType<SortableHandleProps>
}

export const SortableRootContext =
  createContext<SortableRootContextValue | null>(null)

export function useSortableRoot(part: string) {
  const context = use(SortableRootContext)
  if (!context) throw new Error(`${part} must be inside a Sortable`)
  return context
}

export type SortableItemContextValue = {
  value: string
  label?: string
  index: number
  disabled: boolean
  setHandle: (handle: HTMLElement | null) => void
}

export const SortableItemContext =
  createContext<SortableItemContextValue | null>(null)
