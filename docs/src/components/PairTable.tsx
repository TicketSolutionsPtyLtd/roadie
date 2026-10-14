import type { ReactNode } from 'react'

/**
 * Lays out a two-column markdown table, such as write and not, in equal
 * halves of the full width, so every pair on a page lines up and long cells
 * wrap rather than scroll. The table keeps its `ProseScroll` region.
 */
export function PairTable({ children }: { children: ReactNode }) {
  return (
    <div className='[&_table]:w-full [&_table]:table-fixed [&_th]:w-1/2'>
      {children}
    </div>
  )
}
