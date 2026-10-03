import { fireEvent, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { tableColumns, tableLayout } from '.'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { showColumns } from './testUtils'

const layouts = [tableLayout(showColumns)]

function Selectable({ count = 12 }: { count?: number }) {
  const records = useRecords({
    data: testShows(count),
    fields: showFields,
    getRowId: (row) => row.id,
    selectable: true
  })
  return (
    <Records.Root records={records} layouts={layouts} caption='Shows'>
      <Records.Content />
      <p data-testid='count'>{records.selectedCount}</p>
    </Records.Root>
  )
}

const count = () => screen.getByTestId('count').textContent

describe('RecordTable checkbox column', () => {
  it('names each checkbox by its row title', () => {
    render(<Selectable />)
    expect(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Select page' })
    ).toBeInTheDocument()
  })

  it('adds no checkboxes to records that are not selectable', () => {
    function Plain() {
      const records = useRecords({ data: testShows(3), fields: showFields })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Content />
        </Records.Root>
      )
    }
    render(<Plain />)
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getAllByRole('columnheader')).toHaveLength(4)
  })

  it('selects a row, then a range with shift', async () => {
    // A shared session, so Shift held across calls reaches the second click.
    const user = userEvent.setup()
    render(<Selectable />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ball Park Music 1' })
    )
    await user.keyboard('{Shift>}')
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Alex Lahey 1' })
    )
    await user.keyboard('{/Shift}')
    expect(count()).toBe('4')
  })

  it('shows a mixed page checkbox, then selects the page', async () => {
    render(<Selectable />)
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    const page = screen.getByRole('checkbox', { name: 'Select page' })
    expect(page).toHaveAttribute('aria-checked', 'mixed')
    await userEvent.click(page)
    expect(count()).toBe('12')
    expect(
      screen.getByRole('checkbox', { name: 'Select Middle Kids 2' })
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('falls back to the row id when no column names the row', () => {
    const column = tableColumns<TestShow>(showFields)
    const numbers = [tableLayout([column.field('sold')])]
    function Numbers() {
      const records = useRecords({
        data: testShows(3),
        fields: showFields,
        getRowId: (row) => row.id,
        selectable: true
      })
      return (
        <Records.Root records={records} layouts={numbers}>
          <Records.Content />
        </Records.Root>
      )
    }
    render(<Numbers />)
    expect(
      screen.getByRole('checkbox', { name: 'Select show-1' })
    ).toBeInTheDocument()
  })

  it('lets a Shift press on a checkbox take focus, but not elsewhere on the row', () => {
    render(<Selectable />)
    const checkbox = screen.getByRole('checkbox', {
      name: 'Select Alex Lahey 1'
    })
    expect(fireEvent.mouseDown(checkbox, { shiftKey: true })).toBe(true)
    expect(
      fireEvent.mouseDown(screen.getAllByText('Perth')[0]!, { shiftKey: true })
    ).toBe(false)
  })

  it('selects a range with Shift+Space from the keyboard', async () => {
    const user = userEvent.setup()
    render(<Selectable />)
    screen.getByRole('checkbox', { name: 'Select Ball Park Music 1' }).focus()
    await user.keyboard(' ')
    screen.getByRole('checkbox', { name: 'Select Alex Lahey 1' }).focus()
    await user.keyboard('{Shift>} {/Shift}')
    expect(count()).toBe('4')
  })

  it('forgets Shift once Shift+Tab moves focus away', async () => {
    const user = userEvent.setup()
    render(<Selectable />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ball Park Music 1' })
    )
    screen.getByRole('checkbox', { name: 'Select Alex Lahey 1' }).focus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Alex Lahey 1' })
    )
    expect(count()).toBe('2')
  })

  it('disables the page checkbox with no rows', () => {
    function Empty() {
      const records = useRecords({
        data: [],
        fields: showFields,
        selectable: true
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Content />
        </Records.Root>
      )
    }
    render(<Empty />)
    expect(
      screen.getByRole('checkbox', { name: 'Select page' })
    ).toHaveAttribute('data-disabled')
  })

  it('gives skeleton rows the checkbox and actions tracks too', () => {
    function Loading() {
      const records = useRecords({
        data: [],
        fields: showFields,
        selectable: true,
        loading: true,
        rowActions: () => null
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Content />
        </Records.Root>
      )
    }
    const { container } = render(<Loading />)
    const row = container.querySelector(
      '[data-slot="record-table-skeleton"] [role="row"]'
    )!
    expect(row.querySelectorAll('[role="cell"]')).toHaveLength(6)
  })

  it('puts Content className on its outermost element', () => {
    function Placed() {
      const records = useRecords({
        data: testShows(3),
        fields: showFields,
        selectable: true
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Content className='placed' />
        </Records.Root>
      )
    }
    const { container } = render(<Placed />)
    const root = container.querySelector('[data-slot="records"]')!
    expect(root.firstElementChild).toHaveClass('placed')
  })
})
