'use client'

import { Fragment, memo, use, useMemo } from 'react'

import { List, type ListProps } from '../List'
import {
  NavigatorActionsContext,
  NavigatorSelectionContext,
  isActiveValue
} from './NavigatorContext'
import { presentNavIcon } from './presentNavIcon'
import { type SectionRow, sectionRows } from './sectionData'
import { textOf } from './splitSecondary'
import { useSection } from './useNavigatorSection'

export type NavigatorSectionItemsProps = Omit<ListProps, 'children'> & {
  /** The section's item value; omit for the active section. */
  value?: string
  /** Filters rows by label, case-insensitive; groups left empty hide. */
  query?: string
  /** Show each item's `description` beneath its label. @default true */
  descriptions?: boolean
}

type SectionItemsRowProps = {
  row: SectionRow
  current: boolean
  descriptions: boolean
}

// By hand: rows come out of a `map`, which the compiler caches only as a whole,
// so a new `value` would otherwise re-render every row.
const SectionItemsRow = memo(function SectionItemsRow({
  row,
  current,
  descriptions
}: SectionItemsRowProps) {
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

/** A section's items as a `List`; renders nothing when the section isn't found. */
export function NavigatorSectionItems({
  value: sectionValue,
  query = '',
  descriptions = true,
  ...props
}: NavigatorSectionItemsProps) {
  const section = useSection(sectionValue)
  const { value } = use(NavigatorSelectionContext)
  // Keyed on the section alone, so a new `value` keeps every row's identity.
  const rows = useMemo(
    () => (section === null ? [] : sectionRows(section, undefined)),
    [section]
  )
  if (section === null) return null

  const needle = query.trim().toLowerCase()
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
        data-slot='navigator-section-empty'
        className='px-4 py-3 text-sm text-subtle'
      >
        No matches
      </p>
    )
  }

  const row = (item: SectionRow) => (
    <SectionItemsRow
      key={item.value}
      row={item}
      current={isActiveValue(item.value, value)}
      descriptions={descriptions}
    />
  )

  return (
    <List
      data-slot='navigator-section-items'
      data-navigator-items={section.value}
      {...props}
    >
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

NavigatorSectionItems.displayName = 'Navigator.SectionItems'
