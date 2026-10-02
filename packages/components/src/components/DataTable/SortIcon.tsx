import {
  CaretDownIcon,
  CaretUpDownIcon,
  CaretUpIcon
} from '@phosphor-icons/react/ssr'

import type { DataTableSortDirection } from './sort'

export function SortIcon({
  direction
}: {
  direction?: DataTableSortDirection
}) {
  if (direction === 'ascending')
    return <CaretUpIcon weight='bold' className='size-3 shrink-0' aria-hidden />
  if (direction === 'descending')
    return (
      <CaretDownIcon weight='bold' className='size-3 shrink-0' aria-hidden />
    )
  return (
    <CaretUpDownIcon
      weight='bold'
      className='size-3 shrink-0 text-subtler transition-colors group-hover:text-subtle group-focus-visible:text-subtle'
      aria-hidden
    />
  )
}
