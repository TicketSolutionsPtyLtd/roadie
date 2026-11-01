import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { Toggle, type ToggleEmphasis } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Button } from '../Button'
import { useStylesheet } from '../Pane/testUtils'
import { ToggleGroup } from '../ToggleGroup'
import { hoverFill, settledStylesheet } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(await settledStylesheet(commands, roadieCss))
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const EMPHASES: ToggleEmphasis[] = ['normal', 'subtle', 'subtler']

describe('Toggle hover', () => {
  it.each(EMPHASES)(
    'fills an unpressed toggle at %s emphasis',
    async (emphasis) => {
      render(<Toggle emphasis={emphasis}>Italic</Toggle>)
      const { rest, hovered } = await hoverFill(
        screen.getByRole('button', { name: 'Italic' })
      )

      expect(hovered).not.toBe(rest)
    }
  )

  it('takes a subtler button’s hover fill at subtler emphasis', async () => {
    render(
      <>
        <Button emphasis='subtler'>Bold</Button>
        <Toggle emphasis='subtler'>Italic</Toggle>
      </>
    )
    const button = await hoverFill(screen.getByRole('button', { name: 'Bold' }))
    const toggle = await hoverFill(
      screen.getByRole('button', { name: 'Italic' })
    )

    expect(toggle.hovered).toBe(button.hovered)
  })
})

describe('ToggleGroup hover', () => {
  it.each(EMPHASES)(
    'fills an unpressed item at %s emphasis',
    async (emphasis) => {
      render(
        <ToggleGroup emphasis={emphasis} defaultValue={['list']}>
          <ToggleGroup.Item value='list'>List</ToggleGroup.Item>
          <ToggleGroup.Item value='grid'>Grid</ToggleGroup.Item>
        </ToggleGroup>
      )
      const { rest, hovered } = await hoverFill(
        screen.getByRole('button', { name: 'Grid' })
      )

      expect(hovered).not.toBe(rest)
    }
  )

  it.each(EMPHASES)(
    'keeps an item’s size as it is pressed at %s emphasis',
    async (emphasis) => {
      render(
        <ToggleGroup emphasis={emphasis} defaultValue={['list']}>
          <ToggleGroup.Item value='list'>List</ToggleGroup.Item>
          <ToggleGroup.Item value='grid'>Grid</ToggleGroup.Item>
        </ToggleGroup>
      )
      const grid = screen.getByRole('button', { name: 'Grid' })
      const before = grid.getBoundingClientRect().width

      grid.click()

      await expect.element(grid).toHaveAttribute('aria-pressed', 'true')
      expect(grid.getBoundingClientRect().width).toBe(before)
    }
  )

  it.each(EMPHASES)('sets items side by side at %s emphasis', (emphasis) => {
    render(
      <ToggleGroup emphasis={emphasis} defaultValue={['list']}>
        <ToggleGroup.Item value='list'>List</ToggleGroup.Item>
        <ToggleGroup.Item value='grid'>Grid</ToggleGroup.Item>
      </ToggleGroup>
    )
    const list = screen.getByRole('button', { name: 'List' })
    const grid = screen.getByRole('button', { name: 'Grid' })

    expect(grid.getBoundingClientRect().left).toBe(
      list.getBoundingClientRect().right
    )
  })
})
