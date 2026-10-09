import { screen, within } from '@testing-library/react'
import type { userEvent } from '@testing-library/user-event'

import { type TestShow, showFields } from '../Records/testUtils'
import { tableColumns } from './columns'

const column = tableColumns<TestShow>(showFields)

export const showColumns = [
  column.field('show', { pin: true }),
  column.field('city'),
  column.field('sold'),
  column.field('gross')
]

// Wider than 660px, so a table in WIDE_BOX scrolls sideways.
export const wideColumns = [
  column.field('show', { pin: true, width: { min: 16 } }),
  column.field('city', { width: { min: 16 } }),
  column.field('sold', { width: { min: 12 } }),
  column.field('gross', { width: { min: 12 } })
]

export const WIDE_BOX = 660
// A pane insets its content, so it needs more room.
export const WIDE_PANE = 760
export const ALL = { pageSize: 100 }
/** A table row's height at the 16px root, from the spec. */
export const ROW_PX = 48

export const frame = () =>
  new Promise((resolve) => requestAnimationFrame(resolve))
export const slot = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-slot="${name}"]`)!
export const rect = (element: Element) => element.getBoundingClientRect()

type User = ReturnType<typeof userEvent.setup>

/** The bulk actions in a layout's header row, such as a wide table's. */
export const bulkBar = () =>
  screen.queryByRole('toolbar', { name: 'Bulk actions' })

const openCount = (user: User) =>
  user.click(within(bulkBar()!).getByRole('button', { name: /selected$/ }))

/** Picks an item from the bar's count menu, such as Select all N. */
export async function pickFromCount(user: User, name: string) {
  await openCount(user)
  await user.click(await screen.findByRole('menuitem', { name }))
}

/** The bar's count menu items, closing it again. */
export async function countMenuItems(user: User) {
  await openCount(user)
  const items = (await screen.findAllByRole('menuitem')).map(
    (item) => item.textContent
  )
  await user.keyboard('{Escape}')
  return items
}
