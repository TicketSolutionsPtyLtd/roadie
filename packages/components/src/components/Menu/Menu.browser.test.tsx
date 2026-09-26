import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

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
