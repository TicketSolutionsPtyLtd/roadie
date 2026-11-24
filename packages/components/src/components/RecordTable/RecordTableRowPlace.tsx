'use client'

import { type ComponentProps, createContext, use } from 'react'

// Not props of the memoised rows: a search that only moves a row re-renders its element alone.

/** One-based, counting the header row, when the table holds only some of its rows. */
export const RowIndexContext = createContext<number | undefined>(undefined)

export function RowElement(props: ComponentProps<'div'>) {
  return <div role='row' aria-rowindex={use(RowIndexContext)} {...props} />
}

/** A row's place, when the list holds only some of its rows. */
export const ListPlaceContext = createContext<{
  /** One-based place in the whole list. */
  posInSet?: number
  /** The whole list's length, or -1 while unknown. */
  setSize?: number
}>({})

export function ListRowElement(props: ComponentProps<'li'>) {
  const { posInSet, setSize } = use(ListPlaceContext)
  return <li {...props} aria-posinset={posInSet} aria-setsize={setSize} />
}
