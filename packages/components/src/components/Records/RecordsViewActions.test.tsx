import { useState } from 'react'

import { render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { RecordView } from '@oztix/roadie-core/records'

import { Records, useRecords } from '.'
import { RecordTable, tableColumns, tableLayout } from '../RecordTable'
import type { RecordsViewActionsProps } from './RecordsViewActions'
import { type TestShow, showFields, testShows } from './testUtils'

const column = tableColumns<TestShow>(showFields)
const columns = [
  column.field('show', { pin: true }),
  column.field('city'),
  column.field('sold')
]
const layouts = [tableLayout(columns)]
const shows = testShows(20)

const upcoming: RecordView = {
  id: 'upcoming',
  name: 'Upcoming',
  query: {
    search: '',
    filters: [],
    sort: [{ field: 'sold', direction: 'descending' }]
  },
  layout: { type: 'table' }
}

type HarnessProps = RecordsViewActionsProps & {
  baseline?: RecordView
  initialView?: RecordView
}

function Harness({ baseline, initialView, ...actions }: HarnessProps) {
  const [view, setView] = useState(initialView ?? baseline)
  const records = useRecords({
    data: shows,
    fields: showFields,
    ...(view && { view, onViewChange: setView }),
    baseline
  })
  return (
    <Records records={records} layouts={layouts} caption='Shows'>
      <Records.Toolbar>
        <Records.Search />
        <Records.ViewActions {...actions} />
        <Records.Options />
      </Records.Toolbar>
      <Records.Content />
    </Records>
  )
}

const trigger = () => screen.getByRole('button', { name: /^View/ })

async function openMenu(user = userEvent.setup()) {
  await user.click(trigger())
  const menu = await screen.findByRole('menu')
  return { user, menu }
}

const items = (menu: HTMLElement) =>
  within(menu)
    .getAllByRole('menuitem')
    .map((item) => item.textContent)

const handlers = () => ({
  onSave: vi.fn(),
  onSaveAs: vi.fn(),
  onRename: vi.fn(),
  onDelete: vi.fn()
})

describe('Records.ViewActions', { timeout: 15_000 }, () => {
  it('renders nothing with no baseline and no handlers', () => {
    render(<Harness />)
    expect(screen.queryByRole('button', { name: /^View/ })).toBeNull()
  })

  it('names a preset with no action in a button that opens nothing', async () => {
    render(<Harness baseline={upcoming} />)
    expect(trigger()).toHaveAttribute('aria-disabled', 'true')
    await userEvent.setup().click(trigger())
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('keeps focus on the button once Reset leaves nothing to offer', async () => {
    render(
      <Harness
        baseline={upcoming}
        initialView={{ ...upcoming, query: { ...upcoming.query, sort: [] } }}
      />
    )
    const { user, menu } = await openMenu()
    await user.click(within(menu).getByRole('menuitem', { name: 'Reset view' }))
    await waitFor(() => expect(trigger()).toHaveFocus())
    expect(trigger()).toHaveAccessibleName('View: Upcoming')
  })

  it('calls a baseline with no name Untitled view', () => {
    const untitled: RecordView = { ...upcoming }
    delete untitled.name
    render(<Harness baseline={untitled} {...handlers()} />)
    expect(trigger()).toHaveAccessibleName('View: Untitled view')
  })

  it('holds the dialog open while its handler runs, even on Escape', async () => {
    let finish = () => {}
    const onSaveAs = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve))
    )
    render(<Harness baseline={upcoming} {...handlers()} onSaveAs={onSaveAs} />)
    const { user, menu } = await openMenu()
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Save as new view' })
    )
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByRole('textbox'), 'Perth{Enter}')
    await user.keyboard('{Escape}')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('dialog')).toBe(dialog)
    finish()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('shows the full name in a tooltip, with unsaved changes', async () => {
    render(
      <Harness
        baseline={upcoming}
        initialView={{ ...upcoming, query: { ...upcoming.query, sort: [] } }}
        {...handlers()}
      />
    )
    await userEvent.setup().hover(trigger())
    expect(
      await screen.findByText('Upcoming, unsaved changes')
    ).toBeInTheDocument()
  })

  it('names the baseline in a normal button, after the search', () => {
    render(<Harness baseline={upcoming} {...handlers()} />)
    const button = trigger()
    expect(button).toHaveAccessibleName('View: Upcoming')
    expect(button).toHaveTextContent('Upcoming')
    expect(button).toHaveClass('emphasis-normal')
    const toolbar = button.closest('[data-slot="records-toolbar"]')!
    const controls = within(toolbar as HTMLElement).getAllByRole('button')
    expect(controls.indexOf(button)).toBeLessThan(
      controls.indexOf(screen.getByRole('button', { name: 'Configure table' }))
    )
  })

  it('calls an unsaved view Unsaved view, offering only Save as', async () => {
    render(<Harness {...handlers()} />)
    expect(trigger()).toHaveAccessibleName('View: Unsaved view')
    const { menu } = await openMenu()
    expect(items(menu)).toEqual(['Save as new view'])
  })

  it('offers rename, save as and delete while unmodified', async () => {
    render(<Harness baseline={upcoming} {...handlers()} />)
    const { menu } = await openMenu()
    expect(items(menu)).toEqual([
      'Save as new view',
      'Rename view',
      'Delete view'
    ])
  })

  it('marks a modified view and offers save and reset first', async () => {
    render(
      <Harness
        baseline={upcoming}
        initialView={{ ...upcoming, query: { ...upcoming.query, sort: [] } }}
        {...handlers()}
      />
    )
    expect(trigger()).toHaveAccessibleName('View: Upcoming, unsaved changes')
    expect(
      trigger().querySelector('[data-slot="records-view-modified"]')
    ).not.toBeNull()
    const { menu } = await openMenu()
    expect(items(menu)).toEqual([
      'Save view',
      'Reset view',
      'Save as new view',
      'Rename view',
      'Delete view'
    ])
    expect(
      within(menu).getByRole('group', { name: 'Unsaved changes' })
    ).toBeInTheDocument()
  })

  it('leaves out each action whose handler is missing', async () => {
    render(
      <Harness
        baseline={upcoming}
        initialView={{ ...upcoming, query: { ...upcoming.query, sort: [] } }}
        onSaveAs={vi.fn()}
      />
    )
    const { menu } = await openMenu()
    expect(items(menu)).toEqual(['Reset view', 'Save as new view'])
  })

  it('saves the view under the baseline id and name', async () => {
    const actions = handlers()
    const modified = {
      ...upcoming,
      id: 'from-url',
      name: undefined,
      query: { ...upcoming.query, search: 'Perth' }
    }
    render(<Harness baseline={upcoming} initialView={modified} {...actions} />)
    const { user, menu } = await openMenu()
    await user.click(within(menu).getByRole('menuitem', { name: 'Save view' }))
    expect(actions.onSave).toHaveBeenCalledWith({
      ...modified,
      id: 'upcoming',
      name: 'Upcoming'
    })
  })

  it('resets to the baseline', async () => {
    render(
      <Harness
        baseline={upcoming}
        initialView={{
          ...upcoming,
          query: { ...upcoming.query, search: 'Perth' }
        }}
        {...handlers()}
      />
    )
    expect(screen.getByRole('combobox')).toHaveValue('Perth')
    const { user, menu } = await openMenu()
    await user.click(within(menu).getByRole('menuitem', { name: 'Reset view' }))
    expect(screen.getByRole('combobox')).toHaveValue('')
    expect(trigger()).toHaveAccessibleName('View: Upcoming')
  })

  it('saves as a new view under a name, without the id', async () => {
    const actions = handlers()
    const modified = {
      ...upcoming,
      query: { ...upcoming.query, search: 'Perth' }
    }
    render(<Harness baseline={upcoming} initialView={modified} {...actions} />)
    const { user, menu } = await openMenu()
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Save as new view' })
    )
    const dialog = await screen.findByRole('dialog', {
      name: 'Save as new view'
    })
    const name = within(dialog).getByRole('textbox', { name: 'Name' })
    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveValue('')

    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(actions.onSaveAs).not.toHaveBeenCalled()
    expect(within(dialog).getByText('Enter a name')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')

    await user.type(name, '  Perth shows  {Enter}')
    const saved: RecordView = { ...modified, name: 'Perth shows' }
    delete saved.id
    expect(actions.onSaveAs.mock.calls[0]![0]).toStrictEqual(saved)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('keeps the dialog open with the message when saving fails', async () => {
    const onSaveAs = vi
      .fn()
      .mockRejectedValueOnce(new Error('You already have a view called Perth'))
      .mockResolvedValueOnce(undefined)
    render(<Harness baseline={upcoming} onSaveAs={onSaveAs} />)
    const { user, menu } = await openMenu()
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Save as new view' })
    )
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByRole('textbox'), 'Perth{Enter}')
    expect(
      await within(dialog).findByText('You already have a view called Perth')
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onSaveAs).toHaveBeenCalledTimes(2)
  })

  it('keeps a failure it shows to the dialog, not the console', async () => {
    const report = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onSaveAs = vi.fn().mockRejectedValue(new Error('Name taken'))
    render(<Harness baseline={upcoming} onSaveAs={onSaveAs} />)
    const { user, menu } = await openMenu()
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Save as new view' })
    )
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByRole('textbox'), 'Perth{Enter}')
    expect(await within(dialog).findByText('Name taken')).toBeInTheDocument()
    expect(report).not.toHaveBeenCalled()
    report.mockRestore()
  })

  it('marks the name as required', async () => {
    render(<Harness baseline={upcoming} {...handlers()} />)
    const { user, menu } = await openMenu()
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Save as new view' })
    )
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toBeRequired()
    expect(
      dialog.querySelector('[data-slot="required-indicator"]')
    ).not.toBeNull()
  })

  it('shows a plain message for a failure that has none', async () => {
    const onSaveAs = vi.fn().mockRejectedValue('nope')
    render(<Harness baseline={upcoming} onSaveAs={onSaveAs} />)
    const { user, menu } = await openMenu()
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Save as new view' })
    )
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByRole('textbox'), 'Perth{Enter}')
    expect(
      await within(dialog).findByText('The view wasn’t saved. Try again.')
    ).toBeInTheDocument()
  })

  it('holds the submit busy while the save runs', async () => {
    let finish = () => {}
    const onSaveAs = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve))
    )
    render(<Harness baseline={upcoming} onSaveAs={onSaveAs} />)
    const { user, menu } = await openMenu()
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Save as new view' })
    )
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByRole('textbox'), 'Perth{Enter}')
    const submit = within(dialog).getByRole('button', { name: 'Save' })
    expect(submit).toHaveAttribute('aria-busy', 'true')
    await user.type(within(dialog).getByRole('textbox'), '{Enter}')
    expect(onSaveAs).toHaveBeenCalledTimes(1)
    finish()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('renames the baseline, not the changes', async () => {
    const actions = handlers()
    render(
      <Harness
        baseline={upcoming}
        initialView={{
          ...upcoming,
          query: { ...upcoming.query, search: 'Perth' }
        }}
        {...actions}
      />
    )
    const { user, menu } = await openMenu()
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Rename view' })
    )
    const dialog = await screen.findByRole('dialog', { name: 'Rename view' })
    const name = within(dialog).getByRole('textbox', { name: 'Name' })
    expect(name).toHaveValue('Upcoming')
    await user.clear(name)
    await user.type(name, 'Coming up')
    await user.click(within(dialog).getByRole('button', { name: 'Rename' }))
    expect(actions.onRename).toHaveBeenCalledWith({
      ...upcoming,
      name: 'Coming up'
    })
    expect(actions.onSave).not.toHaveBeenCalled()
  })

  it('asks before deleting the baseline', async () => {
    const actions = handlers()
    render(<Harness baseline={upcoming} {...actions} />)
    const { user, menu } = await openMenu()
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Delete view' })
    )
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Delete Upcoming?'
    })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(actions.onDelete).not.toHaveBeenCalled()

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Delete view' }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Delete view'
      })
    )
    expect(actions.onDelete).toHaveBeenCalledWith(upcoming)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })

  it('holds the button busy while a save runs, and reports a failure', async () => {
    let fail = (_: Error) => {}
    const onSave = vi.fn(
      () => new Promise<void>((_, reject) => (fail = reject))
    )
    const report = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Harness
        baseline={upcoming}
        initialView={{ ...upcoming, query: { ...upcoming.query, search: 'x' } }}
        onSave={onSave}
      />
    )
    const { user, menu } = await openMenu()
    await user.click(within(menu).getByRole('menuitem', { name: 'Save view' }))
    expect(trigger()).toHaveAttribute('aria-busy', 'true')
    const error = new Error('offline')
    fail(error)
    await waitFor(() => expect(trigger()).not.toHaveAttribute('aria-busy'))
    expect(report).toHaveBeenCalledWith(error)
    report.mockRestore()
  })
})

describe('Records.Toolbar and RecordTable viewActions', () => {
  it('puts the view actions between the search and Configure', () => {
    render(
      <RecordTable
        data={shows}
        fields={showFields}
        columns={columns}
        baseline={upcoming}
        defaultView={upcoming}
        viewActions={handlers()}
      />
    )
    const toolbar = screen
      .getByRole('combobox', { name: 'Search and filter' })
      .closest('[data-slot="records-toolbar"]') as HTMLElement
    const names = within(toolbar)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent)
    const view = names.findIndex((name) => name?.includes('Upcoming'))
    expect(view).toBeGreaterThan(-1)
    expect(view).toBeLessThan(names.indexOf('Configure table'))
  })

  it('leaves them out without viewActions', () => {
    render(
      <RecordTable
        data={shows}
        fields={showFields}
        columns={columns}
        baseline={upcoming}
        defaultView={upcoming}
      />
    )
    expect(screen.queryByRole('button', { name: /^View/ })).toBeNull()
  })
})
