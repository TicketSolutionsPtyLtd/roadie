import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Toggle } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Button } from '../Button'
import { useStylesheet } from '../Pane/testUtils'
import { ToggleGroup } from '../ToggleGroup'

let removeStylesheet = () => {}
beforeAll(() => {
  // Read the hover fill itself, not a frame of its transition.
  removeStylesheet = useStylesheet(
    `${roadieCss} * { transition: none !important; }`
  )
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

async function hoveredFill(element: HTMLElement) {
  await userEvent.hover(element)
  return getComputedStyle(element).backgroundColor
}

describe('Toggle at subtler emphasis', () => {
  it('takes a subtler button’s hover fill', async () => {
    render(
      <>
        <Button emphasis='subtler'>Bold</Button>
        <Toggle emphasis='subtler'>Italic</Toggle>
      </>
    )
    const button = await hoveredFill(
      screen.getByRole('button', { name: 'Bold' })
    )
    const toggle = await hoveredFill(
      screen.getByRole('button', { name: 'Italic' })
    )

    expect(toggle).toBe(button)
  })

  it('fills a group’s item on hover as a subtler button does', async () => {
    render(
      <>
        <Button emphasis='subtler'>Bold</Button>
        <ToggleGroup emphasis='subtler' defaultValue={['list']}>
          <ToggleGroup.Item value='list'>List</ToggleGroup.Item>
          <ToggleGroup.Item value='grid'>Grid</ToggleGroup.Item>
        </ToggleGroup>
      </>
    )
    const button = await hoveredFill(
      screen.getByRole('button', { name: 'Bold' })
    )
    const item = await hoveredFill(screen.getByRole('button', { name: 'Grid' }))

    expect(item).toBe(button)
  })

  it('keeps a group item’s size as it is pressed', async () => {
    render(
      <ToggleGroup emphasis='subtler' defaultValue={['list']}>
        <ToggleGroup.Item value='list'>List</ToggleGroup.Item>
        <ToggleGroup.Item value='grid'>Grid</ToggleGroup.Item>
      </ToggleGroup>
    )
    const grid = screen.getByRole('button', { name: 'Grid' })
    const before = grid.getBoundingClientRect().width

    await userEvent.click(grid)

    expect(grid).toHaveAttribute('aria-pressed', 'true')
    expect(grid.getBoundingClientRect().width).toBe(before)
  })
})
