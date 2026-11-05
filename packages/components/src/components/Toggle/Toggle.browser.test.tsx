import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { Toggle, type ToggleEmphasis } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Button } from '../Button'
import { useStylesheet } from '../Pane/testUtils'
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
