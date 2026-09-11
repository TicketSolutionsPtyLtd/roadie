'use client'

import { type ReactElement, use } from 'react'

import { List } from '../List'
import { NavigatorContext, isActiveValue } from './NavigatorContext'
import type { NavigatorItemProps } from './NavigatorItem'
import { presentNavIcon } from './presentNavIcon'
import { secondaryBlocks, splitItemChildren, textOf } from './splitSecondary'

export type NavigatorSecondaryItemsProps = {
  className?: string
  /** Filters rows by label, case-insensitive. Groups left empty are hidden. */
  query?: string
}

/** The active section's sub-pages as a `List`. */
export function NavigatorSecondaryItems({
  className,
  query = ''
}: NavigatorSecondaryItemsProps) {
  const { activeSection, value, setValue } = use(NavigatorContext)
  if (activeSection === null) return null

  const needle = query.trim().toLowerCase()
  const blocks = secondaryBlocks(activeSection.secondary.children)
    .map((block) => ({
      ...block,
      items: block.items.filter(
        (item) =>
          needle === '' ||
          textOf(splitItemChildren(item.props.children).label)
            .toLowerCase()
            .includes(needle)
      )
    }))
    .filter((block) => block.items.length > 0)

  if (blocks.length === 0 && needle !== '') {
    return (
      <p
        data-slot='navigator-secondary-empty'
        className='px-4 py-3 text-sm text-subtle'
      >
        No matches
      </p>
    )
  }

  const row = ({ props }: ReactElement<NavigatorItemProps>) => (
    <List.Item
      key={props.value}
      title={splitItemChildren(props.children).label}
      leading={
        props.icon
          ? presentNavIcon(props.icon, 'size-5 text-subtle')
          : undefined
      }
      trailing={props.badge}
      href={props.href}
      chevron={false}
      current={isActiveValue(props.value, value) && 'page'}
      onClick={() => {
        setValue(props.value)
        props.onClick?.()
      }}
    />
  )

  return (
    <List data-slot='navigator-secondary-items' className={className}>
      {blocks.map((block, index) =>
        block.kind === 'loose' ? (
          block.items.map(row)
        ) : (
          <List.Group key={`group-${index}`}>
            {block.title !== null ? (
              <List.GroupTitle>{block.title}</List.GroupTitle>
            ) : null}
            {block.items.map(row)}
          </List.Group>
        )
      )}
    </List>
  )
}

NavigatorSecondaryItems.displayName = 'Navigator.SecondaryItems'
