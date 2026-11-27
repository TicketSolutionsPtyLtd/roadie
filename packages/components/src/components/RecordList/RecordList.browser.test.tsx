import { cleanup, render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import {
  loadBrandFont,
  useStylesheet
} from '@oztix/roadie-browser-testing/stylesheet'

import { RecordList } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { showFields, testShows } from '../Records/testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
  await import('../RecordGrid/RecordGridSettings')
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const row = { title: 'show', description: 'city', details: ['sold'] } as const

const rows = () => [
  ...document.querySelectorAll<HTMLElement>(
    '[data-slot="record-table-list-row"]'
  )
]

describe('RecordList in a browser', { timeout: 30_000 }, () => {
  it('lists the rows with the toolbar, pagination and status', () => {
    render(
      <RecordList
        caption='Shows'
        data={testShows(30)}
        fields={showFields}
        defaultPosition={{ pageSize: 25 }}
        row={row}
      />
    )
    expect(screen.getByRole('list', { name: 'Shows' })).toBeVisible()
    expect(rows()).toHaveLength(25)
    expect(screen.getByLabelText('Search and filter')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeVisible()
    // Status stays empty until there's something to announce.
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  // Its view starts as the default table, which the settings mustn't follow.
  it('names its fields setting for rows, and writes a list', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(
      <RecordList
        data={testShows(2)}
        fields={showFields}
        onViewChange={onViewChange}
        row={row}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Configure list' }))
    const fields = await screen.findByRole(
      'region',
      { name: 'Row fields' },
      { timeout: 5000 }
    )
    await user.click(within(fields).getByRole('button', { name: 'Show Gross' }))
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'list',
      fields: ['sold', 'gross']
    })
  })

  it('selects rows in Select mode with Space, and shows the bulk actions', async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn()
    render(
      <RecordList
        data={testShows(3)}
        fields={showFields}
        getRowId={(show) => show.id}
        bulkActions={[{ label: 'Export', onAction: () => {} }]}
        onSelectionChange={onSelectionChange}
        row={row}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Select' }))
    const checkbox = screen.getByRole('checkbox', {
      name: 'Select Ball Park Music 1'
    })
    checkbox.focus()
    await user.keyboard(' ')
    expect(checkbox).toBeChecked()
    expect(rows()[1]).toHaveAttribute('data-selected')
    expect(onSelectionChange.mock.lastCall).toEqual([{ ids: ['show-1'] }])
    expect(
      await screen.findByRole('group', { name: 'Bulk actions' })
    ).toBeVisible()
  })

  it.each([
    ['empty', {}, 'records-empty'],
    ['error', { error: true }, 'records-error']
  ] as const)('shows the %s state in place of the rows', (_, props, slot) => {
    render(<RecordList data={[]} fields={showFields} row={row} {...props} />)
    expect(document.querySelector(`[data-slot="${slot}"]`)).toBeVisible()
    expect(rows()).toHaveLength(0)
  })
})
