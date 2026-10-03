import { cleanup, render, screen, within } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { RecordTable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { releaseDragPointer } from '../../css/testUtils'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { showFields, testShows } from '../Records/testUtils'
import { tableColumns } from './columns'
import { frame, rect } from './testUtils'

const STILL = '*, *::before, *::after { transition: none !important }'
const TIMEOUT = { timeout: 20_000 }

let removeStylesheets = () => {}
beforeAll(async () => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeStill()
    removeRoadie()
  }
  await loadBrandFont()
})
afterAll(() => removeStylesheets())
// After a drop the library covers the pointer until it moves.
beforeEach(() => commands.pointer([{ type: 'move', x: 1, y: 1, steps: 2 }]))
afterEach(async () => {
  cleanup()
  await releaseDragPointer()
  await page.viewport(1920, 1080)
})

const column = tableColumns(showFields)
const columns = [
  column.field('show', { pin: true }),
  column.field('city'),
  column.field('sold'),
  column.field('gross'),
  column.field('status'),
  column.field('starts')
]

function Shows({ width = 900 }: { width?: number | string }) {
  return (
    <div style={{ width }}>
      <RecordTable
        caption='Shows'
        data={testShows(20)}
        fields={showFields}
        columns={columns}
        tableActions={[
          { label: 'Export CSV', onAction: () => {} },
          { label: 'Print door list', onAction: () => {} }
        ]}
      />
    </div>
  )
}

const headers = () =>
  // A modal drawer hides the page from assistive tech, not from sight.
  screen
    .getAllByRole('columnheader', { hidden: true })
    .map((header) => header.textContent)
const configure = () => screen.getByRole('button', { name: 'Configure table' })
const handle = (name: string) =>
  screen.getByRole('button', { name: `Reorder ${name}` })
const centre = (element: Element) => {
  const box = rect(element)
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

async function open() {
  await userEvent.click(configure())
  const panel = await screen.findByRole('dialog', { name: 'Configure table' })
  await within(panel).findByRole(
    'region',
    { name: 'Columns' },
    { timeout: 5000 }
  )
  await frame()
  await frame()
  return panel
}

/** Drags a column's handle onto the top or bottom of another row. */
async function drag(name: string, onto: string, edge: 'top' | 'bottom') {
  const from = centre(handle(name))
  await commands.pointer([
    { type: 'move', ...from },
    { type: 'down' },
    { type: 'move', x: from.x, y: from.y + 6, steps: 3 },
    { type: 'move', x: from.x, y: from.y + 12, steps: 3 }
  ])
  const target = rect(handle(onto).closest('[data-slot="sortable-item"]')!)
  await commands.pointer([
    {
      type: 'move',
      x: target.left + target.width / 2,
      y: target.top + target.height * (edge === 'top' ? 0.2 : 0.8),
      steps: 6
    },
    { type: 'up' }
  ])
}

const searchField = () =>
  screen
    .getByRole('combobox', { name: 'Search and filter' })
    .closest<HTMLElement>('[data-slot="query-field"]')!

describe('Records.Options', TIMEOUT, () => {
  it('matches the search height beside the actions, with More last', async () => {
    render(<Shows />)
    await frame()
    const height = rect(searchField()).height
    expect(height).toBe(40)
    const toolbar = searchField().closest<HTMLElement>(
      '[data-slot="records-toolbar"]'
    )!
    const buttons = within(toolbar).getAllByRole('button')
    expect(
      buttons.map(
        (button) => button.getAttribute('aria-label') ?? button.textContent
      )
    ).toEqual(['Configure table', 'Export CSV', 'More actions'])
    for (const button of buttons) expect(rect(button).height).toBe(height)
  })

  it('opens a popover lined up with the button end', async () => {
    render(<Shows />)
    const panel = await open()
    expect(
      Math.abs(rect(panel).right - rect(configure()).right)
    ).toBeLessThanOrEqual(1)
    expect(rect(panel).top).toBeGreaterThan(rect(configure()).bottom)
    expect(document.activeElement).toBe(panel)
  })

  it('reorders the table by dragging a column in the popover', async () => {
    render(<Shows />)
    await open()
    await drag('Starts', 'City', 'top')
    expect(headers()).toEqual([
      'Show',
      'Starts',
      'City',
      'Sold',
      'Gross',
      'Status'
    ])
    await drag('City', 'Gross', 'bottom')
    expect(headers()).toEqual([
      'Show',
      'Starts',
      'Sold',
      'Gross',
      'City',
      'Status'
    ])
  })

  it('moves a column by keyboard inside the popover, keeping focus on its handle', async () => {
    render(<Shows />)
    const panel = await open()
    handle('Gross').focus()
    await userEvent.keyboard('{Enter}')
    await expect
      .poll(() => document.activeElement?.textContent)
      .toBe('Move Gross up')
    await userEvent.keyboard('{ArrowDown}')
    await expect
      .poll(() => document.activeElement?.textContent)
      .toBe('Move Gross down')
    await userEvent.keyboard('{ArrowDown}')
    await expect
      .poll(() => document.activeElement?.textContent)
      .toBe('Move Gross to top')
    await userEvent.keyboard('{Enter}')
    expect(headers()).toEqual([
      'Show',
      'Gross',
      'City',
      'Sold',
      'Status',
      'Starts'
    ])
    await expect.poll(() => document.activeElement).toBe(handle('Gross'))
    expect(screen.getByRole('dialog', { name: 'Configure table' })).toBe(panel)
  })

  it('dims a hidden column but keeps its toggle clear', async () => {
    render(<Shows />)
    const panel = await open()
    const toggle = within(panel).getByRole('button', { name: 'Show Sold' })
    const title = (name: string) =>
      handle(name)
        .closest('[data-slot="list-item"]')!
        .querySelector('[data-slot="list-item-title"]')!
    const strong = getComputedStyle(title('City')).color
    await userEvent.click(toggle)
    expect(getComputedStyle(title('Sold')).color).not.toBe(strong)
    expect(getComputedStyle(toggle).opacity).toBe('1')
    expect(headers()).not.toContain('Sold')
  })

  it('scrolls a long list inside a short window', async () => {
    await page.viewport(900, 420)
    render(<Shows />)
    const panel = await open()
    expect(rect(panel).bottom).toBeLessThanOrEqual(window.innerHeight)
    expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight)
  })

  it('opens a bottom drawer on a phone, where a drag still reorders', async () => {
    await page.viewport(390, 844)
    render(<Shows width='100%' />)
    await userEvent.click(configure())
    const drawer = await screen.findByRole('dialog', {
      name: 'Configure table'
    })
    expect(
      within(drawer).getByRole('heading', { name: 'Configure table' })
    ).toBeVisible()
    await within(drawer).findByRole(
      'region',
      { name: 'Columns' },
      { timeout: 5000 }
    )
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(
      Math.abs(rect(drawer).bottom - window.innerHeight)
    ).toBeLessThanOrEqual(1)
    await drag('Gross', 'City', 'top')
    expect(headers()).toEqual([
      'Show',
      'Gross',
      'City',
      'Sold',
      'Status',
      'Starts'
    ])
    expect(
      screen.getByRole('dialog', { name: 'Configure table' })
    ).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await expect
      .poll(() => screen.queryByRole('dialog', { name: 'Configure table' }))
      .toBeNull()
    expect(document.activeElement).toBe(configure())
  })
})
