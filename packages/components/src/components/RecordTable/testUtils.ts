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

export const frame = () =>
  new Promise((resolve) => requestAnimationFrame(resolve))
export const slot = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-slot="${name}"]`)!
export const rect = (element: Element) => element.getBoundingClientRect()
