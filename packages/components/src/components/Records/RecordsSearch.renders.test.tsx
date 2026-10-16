import type { ComponentProps } from 'react'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, expect, it, vi } from 'vitest'

import { recordFields } from '@oztix/roadie-core/records'

import { Records } from '.'
import { tableColumns, tableLayout } from '../RecordTable'
import { RecordsDateCalendarLazy } from './RecordsDateCalendarLazy'
import { type TestShow, testShows } from './testUtils'
import { useRecords } from './useRecords'

const calendarRendered = vi.hoisted(() => vi.fn())

vi.mock('../Calendar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../Calendar')>()
  function Calendar(props: ComponentProps<typeof actual.Calendar>) {
    calendarRendered()
    return <actual.Calendar {...props} />
  }
  return { ...actual, Calendar }
})

const field = recordFields<TestShow>()
const fields = [field.date('starts', { label: 'Starts', moment: 'date' })]
const layouts = [tableLayout([tableColumns<TestShow>(fields).field('starts')])]

function Shows() {
  const records = useRecords({
    data: testShows(10),
    fields,
    getRowId: (row) => row.id,
    timeZone: 'Australia/Sydney',
    now: new Date('2026-10-03T02:00:00Z')
  })
  return (
    <Records.Root records={records} layouts={layouts}>
      <Records.Toolbar />
      <Records.Content />
    </Records.Root>
  )
}

beforeAll(() => RecordsDateCalendarLazy.preload(), 20_000)

it('leaves the calendar be while typing names the same day, as a month written out does', async () => {
  const user = userEvent.setup()
  render(<Shows />)
  await user.click(screen.getByRole('combobox', { name: 'Search and filter' }))
  await user.click(await screen.findByRole('option', { name: /^Starts/ }))
  await user.click(screen.getByRole('button', { name: 'is' }))
  await screen.findByRole('grid')
  await user.keyboard('26 feb')
  expect(
    document.querySelector('[data-suggested][data-date="2027-02-26"]')
  ).not.toBeNull()
  calendarRendered.mockClear()
  await user.keyboard('ruary')
  expect(calendarRendered).not.toHaveBeenCalled()
})
