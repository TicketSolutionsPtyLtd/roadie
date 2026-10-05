import { cn } from '@oztix/roadie-core/utils'

import { ListItemContent, type ListItemContentProps } from './ListItemContent'
import { listItemVariants } from './variants'

/** A row that is neither a link nor a button, for one whose controls sit in its slots, as a sortable row's do. */
export function ListItemStatic({
  className,
  ...content
}: Omit<ListItemContentProps, 'chevron' | 'descriptionId'> & {
  className?: string
}) {
  return (
    <div
      data-slot='list-item'
      className={cn(
        listItemVariants({ interactive: false }),
        // A static subtler row would keep its tint, where a plain row paints nothing at rest.
        'group-data-[contained=subtler]/list:bg-transparent group-data-[emphasis=subtler]/list:bg-transparent',
        className
      )}
    >
      <ListItemContent {...content} chevron={false} />
    </div>
  )
}
