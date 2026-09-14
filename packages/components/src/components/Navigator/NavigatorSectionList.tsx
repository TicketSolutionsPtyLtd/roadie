'use client'

import { Fragment, memo, use, useMemo } from 'react'

import { List, type ListProps } from '../List'
import {
  NavigatorActionsContext,
  type NavigatorActiveSection,
  NavigatorSelectionContext,
  isActiveValue
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

type SectionListRowProps = {
  row: SectionRow
  current: boolean
  descriptions: boolean
}

// Memoised by hand: rows come out of a `map`, which the compiler caches only
// as a whole, so a new `value` would otherwise re-render every row.
const SectionListRow = memo(function SectionListRow({
  row,
  current,
  descriptions
}: SectionListRowProps) {
  const { setValue, activateItem } = use(NavigatorActionsContext)
  return (
    <List.Item
      title={row.label}
      subtitle={descriptions ? row.description : undefined}
      leading={
        row.icon ? presentNavIcon(row.icon, 'size-5 text-subtle') : undefined
      }
      trailing={row.badge}
      href={row.href}
      current={current && 'page'}
      onClick={() => {
        setValue(row.value)
        activateItem(row.value)
      }}
    />
  )
})

/** A section's rows as a `List`, shared by the list pane and `Navigator.SectionItems`. */
export function NavigatorSectionList({
  section,
  query = '',
  descriptions = false,
  ...props
}: NavigatorSectionListProps) {
  const { value } = use(NavigatorSelectionContext)
  const needle = query.trim().toLowerCase()
  // Keyed on the section alone, so a new `value` keeps every row's identity.
  const rows = useMemo(() => sectionRows(section, undefined), [section])
  const groups = rows
    .map((group) => ({
      ...group,
      rows: group.rows.filter(
        (item) =>
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

  const row = (item: SectionRow) => (
    <SectionListRow
      key={item.value}
      row={item}
      current={isActiveValue(item.value, value)}
      descriptions={descriptions}
    />
  )

  return (
    <List {...props}>
      {groups.map((group, index) =>
        group.kind === 'loose' ? (
          <Fragment key={`loose-${index}`}>{group.rows.map(row)}</Fragment>
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
