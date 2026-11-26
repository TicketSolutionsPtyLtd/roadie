import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

import { RecordTable, tableLayout } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { pickMenuItem } from '../../css/testUtils'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { Records, type RecordsAction, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { showColumns } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

function Shows({
  actions,
  width = 360
}: {
  actions: RecordsAction<TestShow>[]
  width?: number
}) {
  return (
    <div style={{ width }}>
      <RecordTable
        caption='Shows'
        data={testShows(12)}
        fields={showFields}
        columns={showColumns}
        getRowId={(row) => row.id}
        actions={actions}
      />
    </div>
  )
}

const actions = (onAction = vi.fn()): RecordsAction<TestShow>[] => [
  { label: 'Export CSV', onAction },
  { label: 'Print door list', onAction: vi.fn() },
  { label: 'Email everyone', onAction: vi.fn() }
]

const more = () => screen.getByRole('button', { name: 'More actions' })

describe('RecordTable table actions in a narrow toolbar', () => {
  it('puts every action in the menu', async () => {
    render(<Shows actions={actions()} />)
    expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull()
    await userEvent.click(more())
    expect(
      (await screen.findAllByRole('menuitem')).map((item) => item.textContent)
    ).toEqual(['Export CSV', 'Print door list', 'Email everyone'])
  })

  it('runs an action from the menu', async () => {
    const onAction = vi.fn()
    render(<Shows actions={actions(onAction)} />)
    await pickMenuItem(userEvent, { from: more(), item: 'Export CSV' })
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('marks the menu busy while one of its actions runs', async () => {
    let finish = () => {}
    const onAction = vi.fn(() => new Promise<void>((done) => (finish = done)))
    render(<Shows actions={[{ label: 'Export CSV', onAction }]} />)
    await pickMenuItem(userEvent, { from: more(), item: 'Export CSV' })
    await waitFor(() => expect(more()).toHaveAttribute('aria-busy', 'true'))
    expect(more()).toHaveAttribute('aria-disabled', 'true')
    await act(async () => finish())
    await waitFor(() => expect(more()).not.toHaveAttribute('aria-busy'))
    expect(more()).not.toHaveAttribute('aria-disabled', 'true')
  })
})

describe('RecordTable table actions in a wide toolbar', () => {
  it('shows no menu for a single action', async () => {
    render(<Shows actions={actions().slice(0, 1)} width={960} />)
    expect(
      await screen.findByRole('button', { name: 'Export CSV' })
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull()
  })

  it('keeps the first action out of the menu', async () => {
    render(<Shows actions={actions()} width={960} />)
    expect(
      await screen.findByRole('button', { name: 'Export CSV' })
    ).toBeVisible()
    await userEvent.click(more())
    expect(
      (await screen.findAllByRole('menuitem')).map((item) => item.textContent)
    ).toEqual(['Print door list', 'Email everyone'])
  })

  it('marks only the button busy while the first action runs', async () => {
    let finish = () => {}
    const onAction = vi.fn(() => new Promise<void>((done) => (finish = done)))
    render(<Shows actions={actions(onAction)} width={960} />)
    const button = await screen.findByRole('button', { name: 'Export CSV' })
    await userEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'))
    expect(more()).not.toHaveAttribute('aria-busy')
    await act(async () => finish())
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'))
  })
})

function OwnActions({ actions }: { actions: RecordsAction<TestShow>[] }) {
  const records = useRecords({
    data: testShows(12),
    fields: showFields,
    getRowId: (row) => row.id
  })
  return (
    <Records.Root
      records={records}
      layouts={[tableLayout(showColumns)]}
      caption='Shows'
    >
      <Records.Actions actions={actions} />
      <Records.Content />
    </Records.Root>
  )
}

describe('Records.Actions outside a header', () => {
  it('shows no menu for a single action', async () => {
    render(<OwnActions actions={actions().slice(0, 1)} />)
    expect(
      await screen.findByRole('button', { name: 'Export CSV' })
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull()
  })
})
