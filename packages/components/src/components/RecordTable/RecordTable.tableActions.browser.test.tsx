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

import { RecordTable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import type { RecordsAction } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { showColumns } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

function Shows({ actions }: { actions: RecordsAction<TestShow>[] }) {
  return (
    <div style={{ width: 360 }}>
      <RecordTable
        caption='Shows'
        data={testShows(12)}
        fields={showFields}
        columns={showColumns}
        getRowId={(row) => row.id}
        tableActions={actions}
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
    await userEvent.click(more())
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Export CSV' })
    )
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('marks the menu busy while one of its actions runs', async () => {
    let finish = () => {}
    const onAction = vi.fn(() => new Promise<void>((done) => (finish = done)))
    render(<Shows actions={[{ label: 'Export CSV', onAction }]} />)
    await userEvent.click(more())
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Export CSV' })
    )
    await waitFor(() => expect(more()).toHaveAttribute('aria-busy', 'true'))
    expect(more()).toHaveAttribute('aria-disabled', 'true')
    await act(async () => finish())
    await waitFor(() => expect(more()).not.toHaveAttribute('aria-busy'))
    expect(more()).not.toHaveAttribute('aria-disabled', 'true')
  })
})
