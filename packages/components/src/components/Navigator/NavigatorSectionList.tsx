'use client'

import { use } from 'react'

import { List, type ListProps } from '../List'
import {
  type NavigatorActiveSection,
  NavigatorContext
} from './NavigatorContext'
import { presentNavIcon } from './presentNavIcon'
import { type SectionRow, sectionRows } from './sectionData'
import { textOf } from './splitSecondary'

export type NavigatorSectionListProps = Omit<ListProps, 'children'> & {
  section: NavigatorActiveSection
  /** Filters rows by label, case-insensitive. Groups left empty are hidden. */
  query?: string
  /** Show each item's `description` beneath its label. */
  descriptions?: boolean
  'data-slot': string
}

/** A section's rows as a `List`, shared by the list pane and `Navigator.SectionItems`. */
export function NavigatorSectionList({
  section,
  query = '',
  descriptions = false,
  ...props
}: NavigatorSectionListProps) {
  const { value, setValue, activateItem } = use(NavigatorContext)
  const needle = query.trim().toLowerCase()
  const groups = sectionRows(section, value)
    .map((group) => ({
      ...group,
      rows: group.rows.filter(
        ({ item }) =>
          needle === '' || textOf(item.label).toLowerCase().includes(needle)
      )
    }))
    .filter((group) => group.rows.length > 0)

  if (groups.length === 0 && needle !== '') {
    return (
      <p
        data-slot='navigator-secondary-empty'
        className='px-4 py-3 text-sm text-subtle'
      >
        No matches
      </p>
    )
  }

  const row = ({ item }: SectionRow) => (
    <List.Item
      key={item.value}
      title={item.label}
      subtitle={descriptions ? item.description : undefined}
      leading={
        item.icon ? presentNavIcon(item.icon, 'size-5 text-subtle') : undefined
      }
      trailing={item.badge}
      href={item.href}
      current={item.current && 'page'}
      onClick={() => {
        setValue(item.value)
        activateItem(item.value)
      }}
    />
  )

  return (
    <List {...props}>
      {groups.map((group, index) =>
        group.kind === 'loose' ? (
          group.rows.map(row)
        ) : (
          <List.Group key={`group-${index}`}>
            {group.title !== undefined ? (
              <List.GroupTitle>{group.title}</List.GroupTitle>
            ) : null}
            {group.rows.map(row)}
          </List.Group>
        )
      )}
    </List>
  )
}

NavigatorSectionList.displayName = 'NavigatorSectionList'
