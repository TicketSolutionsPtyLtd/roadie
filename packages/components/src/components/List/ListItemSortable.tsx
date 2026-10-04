'use client'

import { type ReactElement, use } from 'react'

import { useDevWarning } from '../../utils/useDevWarning'
import { SortableRootContext } from '../Sortable/SortableContext'
import type { ListItemContentProps } from './ListItemContent'
import { ListItemStatic } from './ListItemStatic'

export type ListItemSortableProps = Omit<
  ListItemContentProps,
  'chevron' | 'descriptionId'
> & {
  value: string
  className?: string
  /** Whether the row was given an `href` or `onClick`, which a sortable row drops. */
  actionable: boolean
  /** The plain row, for a `value` outside any `Sortable`. */
  fallback: ReactElement
}

export function ListItemSortable({
  value,
  title,
  description,
  leading,
  trailing,
  className,
  actionable,
  fallback
}: ListItemSortableProps) {
  const sortable = use(SortableRootContext)
  useDevWarning(
    sortable !== null &&
      actionable &&
      'Roadie: a List.Item with a value inside a Sortable is a static row, so its href and onClick are ignored. Put the action in its trailing slot.'
  )
  if (!sortable) return fallback
  const { Item, Handle } = sortable
  const handle = <Handle size='xs' />

  return (
    <Item
      value={value}
      label={typeof title === 'string' ? title : undefined}
      render={<li />}
    >
      <ListItemStatic
        className={className}
        title={title}
        description={description}
        leading={
          leading == null ? (
            handle
          ) : (
            <span className='flex items-center gap-3'>
              {handle}
              {leading}
            </span>
          )
        }
        trailing={trailing}
      />
    </Item>
  )
}
