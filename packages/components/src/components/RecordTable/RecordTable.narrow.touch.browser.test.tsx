import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import { RecordTable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { tableColumns } from './columns'

const TIMEOUT = { timeout: 20_000 }

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(390, 844)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const column = tableColumns<TestShow>(showFields)
const columns = [
  column.field('show', { pin: true, narrow: 'title' }),
  column.field('city', { narrow: 'description' }),
  column.field('status', { narrow: 'trailing' })
]
const cardColumns = [...columns, column.field('gross', { narrow: 'detail' })]

const centre = (element: Element) => {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

// Each tap's caller waits for what it does, as its click can come later.
async function tapOn(element: Element) {
  const { x, y } = centre(element)
  await commands.tap(x, y)
}

function Shows({ cards = false }: { cards?: boolean }) {
  return (
    <div style={{ height: 600, overflowY: 'auto' }} data-testid='box'>
      <RecordTable
        caption='Shows'
        data={testShows(40)}
        fields={showFields}
        columns={cards ? cardColumns : columns}
        getRowHref={(row) => `#tapped-${row.id}`}
        bulkActions={[{ label: 'Export', onAction: () => {} }]}
      />
    </div>
  )
}

const records = () => [
  ...document.querySelectorAll<HTMLElement>(
    '[data-slot="record-table-list-row"], [data-slot="record-table-card"]'
  )
]

describe.each([
  ['list rows', false],
  ['cards', true]
])('RecordTable narrow %s tapped on a phone', (_, cards) => {
  it('opens a record with a tap on its row', TIMEOUT, async () => {
    location.hash = ''
    render(<Shows cards={cards} />)
    await expect.poll(() => records().length).toBeGreaterThan(0)
    await tapOn(within(records()[1]!).getByText('Melbourne'))
    await expect.poll(() => location.hash).toBe('#tapped-show-1')
  })

  it('selects records by tap in Select mode', TIMEOUT, async () => {
    location.hash = ''
    render(<Shows cards={cards} />)
    await expect.poll(() => records().length).toBeGreaterThan(0)
    await tapOn(screen.getByRole('button', { name: 'Select' }))
    await screen.findByRole('button', { name: 'Done' })
    await tapOn(within(records()[0]!).getByText('Brisbane'))
    const bar = await screen.findByRole('group', { name: 'Bulk actions' })
    await expect.poll(() => bar.textContent).toContain('1 selected')
    await tapOn(within(records()[2]!).getByText('Sydney'))
    await expect.poll(() => bar.textContent).toContain('2 selected')
    expect(location.hash).toBe('')
    await tapOn(within(records()[0]!).getByText('Brisbane'))
    await expect.poll(() => bar.textContent).toContain('1 selected')
  })

  it(
    'scrolls with a swipe across the rows, selecting nothing',
    TIMEOUT,
    async ({ skip }) => {
      if (!navigator.userAgent.includes('Chrome')) skip()
      render(<Shows cards={cards} />)
      await expect.poll(() => records().length).toBeGreaterThan(0)
      await tapOn(screen.getByRole('button', { name: 'Select' }))
      await screen.findByRole('button', { name: 'Done' })
      const box = screen.getByTestId('box')
      const from = centre(records()[2]!)
      // The swipe returns once the browser has handled its lift.
      await commands.swipe(from, { x: from.x, y: from.y - 200 })
      await expect.poll(() => box.scrollTop).toBeGreaterThan(0)
      // Fails if a record selects on press rather than on its click.
      expect(screen.queryByRole('group', { name: 'Bulk actions' })).toBeNull()
    }
  )
})
