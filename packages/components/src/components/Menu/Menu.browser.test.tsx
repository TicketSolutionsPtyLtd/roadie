import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { Menu } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { useStylesheet } from '../Pane/testUtils'

const STILL = '*, *::before, *::after { transition: none !important }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
// A pointer left over a row by an earlier test would hover the next popup
// as it mounts, and Firefox then moves focus to that row.
beforeEach(() => commands.parkPointer())
afterEach(() => {
  setHoverCapable(true)
  cleanup()
})

const fill = (element: Element) => getComputedStyle(element).backgroundColor

async function tapCheckboxRow() {
  render(
    <Menu>
      <Menu.Trigger>Columns</Menu.Trigger>
      <Menu.Content>
        <Menu.CheckboxItem>Venue</Menu.CheckboxItem>
        <Menu.CheckboxItem>Tickets sold</Menu.CheckboxItem>
      </Menu.Content>
    </Menu>
  )
  await userEvent.click(screen.getByRole('button', { name: 'Columns' }))
  const tapped = await screen.findByRole('menuitemcheckbox', {
    name: 'Tickets sold'
  })
  const resting = screen.getByRole('menuitemcheckbox', { name: 'Venue' })
  await userEvent.click(tapped)
  await expect.poll(() => tapped.getAttribute('aria-checked')).toBe('true')
  expect(tapped).toHaveAttribute('data-highlighted')
  return { resting, tapped }
}

describe('Menu rows on a touch screen', () => {
  it('drop the highlight once a row that keeps the menu open is tapped', async () => {
    setHoverCapable(false)
    const { resting, tapped } = await tapCheckboxRow()

    expect(fill(tapped)).toBe(fill(resting))
  })

  it('still highlight under a pointer that can hover', async () => {
    setHoverCapable(true)
    const { resting, tapped } = await tapCheckboxRow()

    expect(fill(tapped)).not.toBe(fill(resting))
  })

  it('still highlight the row a keyboard moves to', async () => {
    setHoverCapable(false)
    render(
      <Menu>
        <Menu.Trigger>Columns</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>Venue</Menu.Item>
          <Menu.Item>Tickets sold</Menu.Item>
        </Menu.Content>
      </Menu>
    )
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Columns' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    const second = await screen.findByRole('menuitem', { name: 'Tickets sold' })
    const first = screen.getByRole('menuitem', { name: 'Venue' })
    // The menu focuses its first row a frame after it opens; an arrow pressed
    // before that is lost.
    await expect.poll(() => document.activeElement).toBe(first)
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(() => document.activeElement).toBe(second)

    expect(fill(second)).not.toBe(fill(first))
  })
})

describe('Menu shortcuts on a touch screen', () => {
  afterEach(() => {
    delete document.body.dataset.keyboardHints
  })

  it('shows a portalled shortcut when the page keeps keyboard hints', async () => {
    document.body.dataset.keyboardHints = 'always'
    render(
      <Menu>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item shortcut={['mod', 'd']}>Duplicate</Menu.Item>
        </Menu.Content>
      </Menu>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Actions' }))
    const row = await screen.findByRole('menuitem', { name: 'Duplicate' })
    setHoverCapable(false)
    const shortcut = row.querySelector('[data-slot="menu-item-shortcut"]')!
    expect(getComputedStyle(shortcut).display).not.toBe('none')
  })
})

describe('Menu choice rows with shortcuts', () => {
  const rightEdge = (row: Element) =>
    row
      .querySelector('[data-slot="menu-item-shortcut"]')!
      .getBoundingClientRect().right
  const checkShows = (row: Element) => {
    const check = row.querySelector('[data-slot="menu-item-indicator"]')
    return check ? getComputedStyle(check).visibility === 'visible' : false
  }

  async function expectAligned(role: 'menuitemradio' | 'menuitemcheckbox') {
    await userEvent.click(screen.getByRole('button', { name: 'Format' }))
    const rows = await screen.findAllByRole(role)
    const edges = rows.map(rightEdge)
    for (const edge of edges) {
      expect(Math.abs(edge - edges[0]!)).toBeLessThanOrEqual(0.5)
    }
    expect(rows.map(checkShows)).toEqual([false, true, false])
  }

  it('line up radio item shortcuts when one is checked', async () => {
    render(
      <Menu>
        <Menu.Trigger>Format</Menu.Trigger>
        <Menu.Content>
          <Menu.RadioGroup defaultValue='h2'>
            <Menu.RadioItem value='p' shortcut='⌘⌥0'>
              Paragraph
            </Menu.RadioItem>
            <Menu.RadioItem value='h2' shortcut='⌘⌥2'>
              Heading 2
            </Menu.RadioItem>
            <Menu.RadioItem value='quote' shortcut='⌘⇧B'>
              Quote
            </Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu>
    )
    await expectAligned('menuitemradio')
  })

  it('line up checkbox item shortcuts when one is checked', async () => {
    render(
      <Menu>
        <Menu.Trigger>Format</Menu.Trigger>
        <Menu.Content>
          <Menu.CheckboxItem shortcut='⌘B'>Bold</Menu.CheckboxItem>
          <Menu.CheckboxItem shortcut='⌘I' defaultChecked>
            Italic
          </Menu.CheckboxItem>
          <Menu.CheckboxItem shortcut='⌘U'>Underline</Menu.CheckboxItem>
        </Menu.Content>
      </Menu>
    )
    await expectAligned('menuitemcheckbox')
    const rows = screen.getAllByRole('menuitemcheckbox')
    await userEvent.click(rows[0]!)
    await userEvent.click(rows[1]!)
    await expect.poll(() => rows.map(checkShows)).toEqual([true, false, false])
  })
})
