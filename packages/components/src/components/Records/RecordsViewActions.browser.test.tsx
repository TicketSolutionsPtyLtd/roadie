import { useState } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import type { RecordView } from '@oztix/roadie-core/records'

import roadieCss from '../../../vitest.browser.css?inline'
import { withFrames } from '../../css/testUtils'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { RecordTable, tableColumns } from '../RecordTable'
import { showFields, testShows } from './testUtils'

const TIMEOUT = { timeout: 20_000 }

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  cleanup()
  await page.viewport(1920, 1080)
})

const column = tableColumns(showFields)
const columns = [
  column.field('show', { pin: true }),
  column.field('city'),
  column.field('sold')
]
const upcoming: RecordView = {
  id: 'upcoming',
  name: 'Upcoming shows in every city',
  query: { search: '', filters: [], sort: [] },
  layout: { type: 'table' }
}

function Shows({ selectable = false }: { selectable?: boolean }) {
  const [baseline, setBaseline] = useState(upcoming)
  const [view, setView] = useState<RecordView>({
    ...upcoming,
    query: { ...upcoming.query, search: 'Perth' }
  })
  return (
    <div style={{ width: '100%', maxWidth: 900 }}>
      <RecordTable
        caption='Shows'
        data={testShows(20)}
        fields={showFields}
        columns={columns}
        view={view}
        onViewChange={setView}
        baseline={baseline}
        bulkActions={
          selectable ? [{ label: 'Export', onAction: () => {} }] : undefined
        }
        viewActions={{
          onSave: setBaseline,
          onSaveAs: (saved) => {
            const next = { ...saved, id: 'perth' }
            setBaseline(next)
            setView(next)
          },
          onRename: setBaseline,
          onDelete: () => setBaseline({ ...upcoming, id: 'all', name: 'All' })
        }}
      />
    </div>
  )
}

const trigger = () => screen.getByRole('button', { name: /^View: / })

describe('Records.ViewActions in a browser', TIMEOUT, () => {
  it('shows the modified mark and keeps a long name to one line', async () => {
    render(<Shows />)
    const button = trigger()
    const mark = button.querySelector('[data-slot="records-view-modified"]')!
    expect(mark.getBoundingClientRect().width).toBeGreaterThan(0)
    expect(getComputedStyle(mark).backgroundColor).not.toBe(
      getComputedStyle(button).backgroundColor
    )
    const text = button.querySelector('.truncate')!
    expect(text.scrollWidth).toBeGreaterThan(text.clientWidth)
    expect(button.getBoundingClientRect().height).toBe(
      screen
        .getByRole('button', { name: 'Configure table' })
        .getBoundingClientRect().height
    )
  })

  it('saves as a new view in a dialog and returns focus to the button', async () => {
    render(<Shows />)
    await userEvent.click(trigger())
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Save as new view' })
    )
    const dialog = await screen.findByRole('dialog', {
      name: 'Save as new view'
    })
    const name = within(dialog).getByRole('textbox', { name: 'Name' })
    await expect.poll(() => document.activeElement).toBe(name)
    await userEvent.keyboard('Perth shows{Enter}')
    await withFrames(() =>
      expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    )
    expect(trigger()).toHaveAccessibleName('View: Perth shows')
    await expect.poll(() => document.activeElement).toBe(trigger())
  })

  it('selects the whole name to rename it', async () => {
    render(<Shows />)
    await userEvent.click(trigger())
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Rename view' })
    )
    const name = within(
      await screen.findByRole('dialog', { name: 'Rename view' })
    ).getByRole<HTMLInputElement>('textbox', { name: 'Name' })
    await expect.poll(() => document.activeElement).toBe(name)
    expect(name.selectionStart).toBe(0)
    expect(name.selectionEnd).toBe(upcoming.name!.length)
    await userEvent.keyboard('Coming up{Enter}')
    await withFrames(() =>
      expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    )
    expect(trigger()).toHaveAccessibleName('View: Coming up, unsaved changes')
  })

  it('asks for the name in a bottom drawer on a phone', async () => {
    await page.viewport(390, 844)
    render(<Shows />)
    await userEvent.click(trigger())
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Save as new view' })
    )
    const drawer = await screen.findByRole('dialog', {
      name: 'Save as new view'
    })
    expect(
      drawer.closest('[data-slot="drawer-popup"], [data-slot="dialog-popup"]')
    ).toHaveAttribute('data-slot', 'drawer-popup')
    await withFrames(() =>
      expect
        .poll(() =>
          Math.abs(drawer.getBoundingClientRect().bottom - window.innerHeight)
        )
        .toBeLessThan(2)
    )
    const name = within(drawer).getByRole('textbox', { name: 'Name' })
    await expect.poll(() => document.activeElement).toBe(name)
    await userEvent.keyboard('Perth{Enter}')
    await withFrames(() =>
      expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    )
    expect(trigger()).toHaveAccessibleName('View: Perth')
  })

  it('returns focus to the button from a phone drawer closed with Escape', async () => {
    await page.viewport(390, 844)
    render(<Shows />)
    await userEvent.click(trigger())
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Rename view' })
    )
    await screen.findByRole('dialog', { name: 'Rename view' })
    await userEvent.keyboard('{Escape}')
    await withFrames(() =>
      expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    )
    await expect.poll(() => document.activeElement).toBe(trigger())
  })

  it('asks to delete in an alert dialog on a phone, then returns focus', async () => {
    await page.viewport(390, 844)
    render(<Shows />)
    await userEvent.click(trigger())
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete view' })
    )
    const alert = await screen.findByRole('alertdialog')
    expect(alert).toHaveAttribute('data-slot', 'dialog-popup')
    await userEvent.click(
      within(alert).getByRole('button', { name: 'Delete view' })
    )
    await withFrames(() =>
      expect.poll(() => screen.queryByRole('alertdialog')).toBeNull()
    )
    expect(trigger()).toHaveAccessibleName('View: All, unsaved changes')
    await expect.poll(() => document.activeElement).toBe(trigger())
  })

  it('keeps focus on the button after Reset', async () => {
    render(<Shows />)
    await userEvent.click(trigger())
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Reset view' })
    )
    await expect.poll(() => document.activeElement).toBe(trigger())
    expect(trigger()).toHaveAccessibleName('View: Upcoming shows in every city')
  })

  it('fits beside the search and Select on a phone, in and out of Select mode', async () => {
    await page.viewport(390, 844)
    const { container } = render(
      <div style={{ paddingInline: 16 }}>
        <Shows selectable />
      </div>
    )
    const toolbar = container.querySelector<HTMLElement>(
      '[data-slot="records-toolbar"]'
    )!
    await expect
      .poll(() => container.querySelector('[data-slot="record-table-body"]'))
      .not.toBeNull()
    const fits = () => {
      const bounds = toolbar.getBoundingClientRect()
      return [...toolbar.querySelectorAll('button, input:not([aria-hidden])')]
        .filter((control) => {
          const box = control.getBoundingClientRect()
          return box.left < bounds.left - 0.5 || box.right > bounds.right + 0.5
        })
        .map(
          (control) => control.getAttribute('aria-label') ?? control.textContent
        )
    }
    const height = screen
      .getByRole('button', { name: 'Select' })
      .getBoundingClientRect().height
    expect(trigger().getBoundingClientRect().height).toBe(height)
    expect(fits()).toEqual([])
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390)

    await userEvent.click(screen.getByRole('button', { name: 'Select' }))
    await expect
      .poll(() => screen.queryByRole('button', { name: 'Done' }))
      .not.toBeNull()
    expect(fits()).toEqual([])
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390)
    await userEvent.click(trigger())
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Reset view' })
    )
    expect(trigger()).toHaveAccessibleName('View: Upcoming shows in every city')
    await expect.poll(() => document.activeElement).toBe(trigger())
  })
})
