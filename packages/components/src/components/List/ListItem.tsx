import { type MouseEvent, type ReactNode, useId } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { ListItemContent } from './ListItemContent'
import { ListItemSortable } from './ListItemSortable'
import { listItemVariants } from './variants'

export type ListItemProps = {
  /** Primary text; the only required prop. */
  title: ReactNode
  /** Secondary line beneath the title. */
  description?: ReactNode
  /** Leading slot — an `IconTile`, `Image`, or avatar. */
  leading?: ReactNode
  /** Trailing slot — a count, `Badge`, value, or selected check. */
  trailing?: ReactNode
  /** Show the drill-in chevron; defaults to whether `href` is set. */
  chevron?: boolean
  /** Link target, routed like `Card`'s `href`; omit to render a `<button>`. */
  href?: string
  /** Marks the item as current; `true` or a token sets `aria-current`. */
  current?: ListItemCurrent
  /** Inside a `Sortable`, makes the row reorderable: a drag handle leads, and the row is no longer a link or button. */
  value?: string
  className?: string
  onClick?: (event: MouseEvent<HTMLElement>) => void
}

export type ListItemCurrent = boolean | 'page' | 'step' | 'location'

/** A row in a `List`: a link when `href` is set, otherwise a `<button>`. */
export function ListItem({
  title,
  description,
  leading,
  trailing,
  chevron,
  href,
  current = false,
  value,
  className,
  onClick
}: ListItemProps) {
  const descriptionId = useId()
  const describedBy = description != null ? descriptionId : undefined

  const content = (
    <ListItemContent
      title={title}
      description={description}
      descriptionId={descriptionId}
      leading={leading}
      trailing={trailing}
      chevron={chevron ?? href !== undefined}
    />
  )

  const finalClassName = cn(
    listItemVariants({ selected: current !== false }),
    className
  )
  const ariaCurrent = current === false ? undefined : current

  const row = (
    <li>
      {href !== undefined ? (
        <RoadieRoutedLink
          data-slot='list-item'
          aria-current={ariaCurrent}
          aria-describedby={describedBy}
          className={finalClassName}
          href={href}
          onClick={onClick}
        >
          {content}
        </RoadieRoutedLink>
      ) : (
        <button
          type='button'
          data-slot='list-item'
          aria-current={ariaCurrent}
          aria-describedby={describedBy}
          className={finalClassName}
          onClick={onClick}
        >
          {content}
        </button>
      )}
    </li>
  )

  if (value === undefined) return row
  return (
    <ListItemSortable
      value={value}
      title={title}
      description={description}
      leading={leading}
      trailing={trailing}
      className={className}
      actionable={href !== undefined || onClick !== undefined}
      fallback={row}
    />
  )
}

ListItem.displayName = 'List.Item'
