import { useState } from 'react'

import { act, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RecordTable } from '.'
import type { RecordsAction } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { showColumns } from './testUtils'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function goNarrow() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 360,
    height: 0,
    top: 0,
    left: 0,
    right: 360,
    bottom: 0,
    x: 0,
    y: 0
  } as DOMRect)
}

const shows = testShows(12)

function Shows({
  actions,
  bulk = false
}: {
  actions: RecordsAction<TestShow>[]
  bulk?: boolean
}) {
  return (
    <RecordTable
      caption='Shows'
      data={shows}
      fields={showFields}
      columns={showColumns}
      getRowId={(row) => row.id}
      tableActions={actions}
      bulkActions={bulk ? [{ label: 'Refund', onAction: vi.fn() }] : undefined}
    />
  )
}

const actions = (onAction = vi.fn()): RecordsAction<TestShow>[] => [
  { label: 'Export CSV', onAction },
  { label: 'Print door list', onAction: vi.fn() },
  { label: 'Email everyone', onAction: vi.fn() }
]

describe('RecordTable table actions', () => {
  it('shows the first action as a button and the rest in a menu, last in the toolbar', async () => {
    render(<Shows actions={actions()} />)
    const toolbar = document.querySelector('[data-slot="records-toolbar"]')!
    const button = screen.getByRole('button', { name: 'Export CSV' })
    expect(toolbar).toContainElement(button)
    const more = screen.getByRole('button', { name: 'More actions' })
    expect(
      button.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    const buttons = [...toolbar.querySelectorAll('button')]
    expect(buttons.at(-1)).toBe(more)
    await userEvent.click(more)
    expect(
      (await screen.findAllByRole('menuitem')).map((item) => item.textContent)
    ).toEqual(['Print door list', 'Email everyone'])
  })

  it('shows no menu for a single action', () => {
    render(<Shows actions={actions().slice(0, 1)} />)
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull()
  })

  it('puts every action in the menu in a narrow toolbar', async () => {
    goNarrow()
    render(<Shows actions={actions()} />)
    expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(
      (await screen.findAllByRole('menuitem')).map((item) => item.textContent)
    ).toEqual(['Export CSV', 'Print door list', 'Email everyone'])
  })

  it('acts on the applied query and the records, with nothing selected', async () => {
    const onAction = vi.fn()
    render(<Shows actions={actions(onAction)} bulk />)
    await userEvent.click(screen.getByRole('searchbox'))
    await userEvent.paste('ocean')
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
    expect(onAction).toHaveBeenCalledOnce()
    const [query, records] = onAction.mock.calls[0]!
    expect(query).toMatchObject({ search: 'ocean' })
    expect(records.appliedView.query).toBe(query)
    expect(records.selectedCount).toBe(0)
    expect(records.matchingRows).toHaveLength(2)
    expect(screen.queryByRole('toolbar', { name: 'Bulk actions' })).toBeNull()
  })

  it('runs an action from the menu', async () => {
    const onAction = vi.fn()
    goNarrow()
    render(<Shows actions={actions(onAction)} />)
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Export CSV' })
    )
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('confirms a danger action before running it', async () => {
    const onAction = vi.fn()
    render(
      <Shows
        actions={[{ label: 'Cancel orders', intent: 'danger', onAction }]}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel orders' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('Cancel orders 12 records?')
    expect(onAction).not.toHaveBeenCalled()
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Cancel orders' }).at(-1)!
    )
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('disables a running action and reports a rejection', async () => {
    let fail: (error: Error) => void = () => {}
    const onAction = vi.fn(
      () => new Promise<void>((_, reject) => (fail = reject))
    )
    const report = vi.fn()
    vi.stubGlobal('reportError', report)
    render(<Shows actions={[{ label: 'Export CSV', onAction }]} />)
    const button = screen.getByRole('button', { name: 'Export CSV' })
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveFocus()
    const error = new Error('Export failed')
    await act(async () => fail(error))
    await waitFor(() =>
      expect(button).not.toHaveAttribute('aria-disabled', 'true')
    )
    expect(button).not.toHaveAttribute('aria-busy')
    expect(report).toHaveBeenCalledWith(error)
  })

  it('marks the menu busy while one of its actions runs', async () => {
    let finish = () => {}
    const onAction = vi.fn(() => new Promise<void>((done) => (finish = done)))
    goNarrow()
    render(<Shows actions={[{ label: 'Export CSV', onAction }]} />)
    const more = screen.getByRole('button', { name: 'More actions' })
    await userEvent.click(more)
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Export CSV' })
    )
    await waitFor(() => expect(more).toHaveAttribute('aria-busy', 'true'))
    expect(more).toHaveAttribute('aria-disabled', 'true')
    await act(async () => finish())
    await waitFor(() => expect(more).not.toHaveAttribute('aria-busy'))
    expect(more).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('stays busy when the parent passes fresh actions mid-run', async () => {
    let finish = () => {}
    function Parent() {
      const [runs, setRuns] = useState(0)
      return (
        <Shows
          actions={[
            {
              label: 'Export CSV',
              onAction: () => {
                setRuns(runs + 1)
                return new Promise<void>((done) => (finish = done))
              }
            }
          ]}
        />
      )
    }
    render(<Parent />)
    const button = screen.getByRole('button', { name: 'Export CSV' })
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-busy', 'true')
    await act(async () => finish())
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'))
  })
})
