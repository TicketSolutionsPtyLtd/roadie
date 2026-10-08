import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import { RecordTable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { settledBox } from '../../utils/touchTestUtils'
import { useStylesheet } from '../Pane/testUtils'
import { showFields, testShows } from '../Records/testUtils'
import { tableColumns } from './columns'

const TIMEOUT = { timeout: 20_000 }

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(390, 844)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const column = tableColumns(showFields)
const columns = [
  column.field('show', { pin: true }),
  // Details, so a phone's cards show their order and visibility too.
  column.field('city', { narrow: 'detail' }),
  column.field('sold', { narrow: 'detail' }),
  column.field('gross', { narrow: 'detail' }),
  column.field('status', { narrow: 'detail' }),
  column.field('starts', { narrow: 'detail' })
]

const centre = (element: Element) => {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}
/** The columns shown, in order: the headers, or on a phone the first card's title and details. */
function headers() {
  const card = document.querySelector('[data-slot="record-card"]')
  if (card)
    return [
      'Show',
      ...[...card.querySelectorAll('dt')].map((term) => term.textContent)
    ]
  // A modal drawer hides the page from assistive tech, not from sight.
  return screen
    .getAllByRole('columnheader', { hidden: true })
    .map((header) => header.textContent)
}
const handle = (name: string) =>
  screen.getByRole('button', { name: `Reorder ${name}` })

/** Waits for animations to end and the element to hold still, as a slow runner may still be moving it. */
async function still(element: Element) {
  await Promise.all(
    document
      .getAnimations()
      .filter(
        (animation) =>
          animation.playState === 'running' &&
          animation.effect?.getComputedTiming().endTime !== Infinity
      )
      .map((animation) => animation.finished.catch(() => {}))
  )
  await settledBox(element)
}

// Each tap's caller waits for what it does, as its click can come later.
async function tapOn(element: Element) {
  await still(element)
  const { x, y } = centre(element)
  await commands.tap(x, y)
}

async function openDrawer() {
  render(
    <RecordTable
      caption='Shows'
      data={testShows(20)}
      fields={showFields}
      columns={columns}
    />
  )
  await tapOn(screen.getByRole('button', { name: 'Configure table' }))
  const drawer = await screen.findByRole('dialog', { name: 'Configure table' })
  await within(drawer).findByRole(
    'region',
    { name: 'Columns' },
    { timeout: 5000 }
  )
  await still(drawer)
  return drawer
}

describe('Records.Options tapped on a phone', TIMEOUT, () => {
  it('moves a column from the Move menu', async () => {
    await openDrawer()
    await tapOn(handle('Starts'))
    await tapOn(
      await screen.findByRole(
        'menuitem',
        { name: 'Move Starts to top' },
        { timeout: 5000 }
      )
    )
    await expect
      .poll(headers)
      .toEqual(['Show', 'Starts', 'City', 'Sold', 'Gross', 'Status'])
    expect(
      screen.getByRole('dialog', { name: 'Configure table' })
    ).toBeVisible()
  })

  it('hides a column with its eye', async () => {
    const drawer = await openDrawer()
    await tapOn(within(drawer).getByRole('button', { name: 'Show City' }))
    await expect
      .poll(headers)
      .toEqual(['Show', 'Sold', 'Gross', 'Status', 'Starts'])
    expect(
      within(drawer).getByRole('button', { name: 'Show City' })
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('scrolls the drawer with a swipe across the rows', async ({ skip }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    await page.viewport(390, 560)
    try {
      const drawer = await openDrawer()
      const body = drawer.querySelector<HTMLElement>(
        '[data-slot="drawer-body"]'
      )!
      expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
      const from = centre(within(drawer).getByText('Gross'))
      // The swipe returns once the browser has handled its lift.
      await commands.swipe(from, { x: from.x, y: from.y - 160 })
      await expect.poll(() => body.scrollTop).toBeGreaterThan(0)
      expect(
        screen.getByRole('dialog', { name: 'Configure table' })
      ).toBeVisible()
    } finally {
      await page.viewport(390, 844)
    }
  })
})
