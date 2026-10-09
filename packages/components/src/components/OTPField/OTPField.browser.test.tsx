import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { OTPField } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('OTPField slots', () => {
  it.each([
    ['sm', 32],
    ['md', 40],
    ['lg', 48]
  ] as const)('are %s squares of %ipx with room to spare', (size, edge) => {
    render(
      <div style={{ width: 600 }}>
        <OTPField length={4} aria-label='Code' size={size} />
      </div>
    )
    for (const slot of screen.getAllByRole('textbox')) {
      const { width, height } = slot.getBoundingClientRect()
      expect(width).toBe(edge)
      expect(height).toBe(edge)
    }
  })

  it('lets one slot override the root size', () => {
    render(
      <div style={{ width: 600 }}>
        <OTPField length={2} aria-label='Code'>
          <OTPField.Input size='lg' />
          <OTPField.Input />
        </OTPField>
      </div>
    )
    const widths = screen
      .getAllByRole('textbox')
      .map((slot) => slot.getBoundingClientRect().width)
    expect(widths).toEqual([48, 40])
  })
})
