'use client'

import { Fragment, memo, use, useMemo } from 'react'

import { List, type ListProps } from '../List'
import {
  NavigatorActionsContext,
  NavigatorSelectionContext,
  isActiveValue
} from './NavigatorContext'
import { opensElsewhere } from './opensElsewhere'
import { presentNavIcon } from './presentNavIcon'
import { type SecondaryRow, secondaryRows } from './secondaryData'
import { textOf } from './splitSecondary'
import { useSecondary } from './useNavigatorSecondary'

export type NavigatorSecondaryItemsProps = Omit<ListProps, 'children'> & {
  /** The destination's item value; omit for the active one. */
  value?: string
  /** Filters rows by label, ignoring case. Empty groups hide. */
  query?: string
  /** Show each item's `description` beneath its label. @default true */
  showDescriptions?: boolean
}

type SecondaryItemsRowProps = {
  row: SecondaryRow
  current: boolean
  showDescriptions: boolean
}

// By hand: the compiler caches a `map` only whole, so a new `value` would re-render every row.
const SecondaryItemsRow = memo(function SecondaryItemsRow({
  row,
  current,
  showDescriptions
}: SecondaryItemsRowProps) {
  const { setValue, activateItem } = use(NavigatorActionsContext)
  return (
    <List.Item
      title={row.label}
      description={showDescriptions ? row.description : undefined}
      leading={
        row.icon ? presentNavIcon(row.icon, 'size-5 text-subtle') : undefined
      }
      trailing={row.badge}
      href={row.href}
      current={current && 'page'}
      onClick={(event) => {
        if (!opensElsewhere(event)) setValue(row.value)
        activateItem(row.value)
      }}
    />
  )
})

/** A secondary's items as a `List`; renders nothing when the secondary isn't found. */
export function NavigatorSecondaryItems({
  value: secondaryValue,
  query = '',
  showDescriptions = true,
  ...props
}: NavigatorSecondaryItemsProps) {
  const secondary = useSecondary(secondaryValue)
  const { value } = use(NavigatorSelectionContext)
  // Keyed on the secondary alone, so a new `value` keeps every row's identity.
  const rows = useMemo(
    () => (secondary === null ? [] : secondaryRows(secondary, undefined)),
    [secondary]
  )
  if (secondary === null) return null

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
        data-slot='navigator-secondary-empty'
        className='px-4 py-3 text-sm text-subtle'
      >
        No matches
      </p>
    )
  }

  const row = (item: SecondaryRow) => (
    <SecondaryItemsRow
      key={item.value}
      row={item}
      current={isActiveValue(item.value, value)}
      showDescriptions={showDescriptions}
    />
  )

  return (
    <List
      data-slot='navigator-secondary-items'
      data-navigator-items={secondary.value}
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

NavigatorSecondaryItems.displayName = 'Navigator.SecondaryItems'
