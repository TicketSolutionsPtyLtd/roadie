'use client'

import type { ReactNode } from 'react'

import { DotsThreeIcon } from '@phosphor-icons/react'

import { IconButton } from '../Button'
import { Menu } from '../Menu'

type RowActions = (row: object) => ReactNode

// Called only once the menu opens, so a memoised row never shows stale items.
function RowActionItems({
  row,
  rowActions
}: {
  row: object
  rowActions: RowActions
}) {
  return rowActions(row)
}

/** A record's own actions, in a menu named for it. */
export function RecordsRowActions({
  title,
  row,
  rowActions
}: {
  title: string
  row: object
  rowActions: RowActions
}) {
  return (
    <Menu>
      <Menu.Trigger
        render={
          <IconButton
            aria-label={`More actions for ${title}`}
            size='sm'
            emphasis='subtler'
            // btn sets place-self: start, which wins over the cell's centring.
            className='self-center'
          >
            <DotsThreeIcon weight='bold' className='size-4' aria-hidden />
          </IconButton>
        }
      />
      <Menu.Content>
        <RowActionItems row={row} rowActions={rowActions} />
      </Menu.Content>
    </Menu>
  )
}
