import { screen, within } from '@testing-library/react'
import type { userEvent } from '@testing-library/user-event'

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
