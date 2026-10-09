import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { RadioGroup, type RadioGroupProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

function renderSeats({ direction }: Pick<RadioGroupProps, 'direction'>) {
  render(
    <div style={{ width: 600 }}>
      <RadioGroup direction={direction}>
        <RadioGroup.Item value='floor' label='Floor' />
        <RadioGroup.Item value='balcony' label='Balcony' />
      </RadioGroup>
    </div>
  )
  const box = (name: string) =>
    screen
      .getByRole('radio', { name })
      .closest('[data-slot="radio-group-item"]')!
      .getBoundingClientRect()
  return { floor: box('Floor'), balcony: box('Balcony') }
}

describe('RadioGroup direction', () => {
  it('stacks its items by default', () => {
    const { floor, balcony } = renderSeats({})
    expect(balcony.top).toBeGreaterThanOrEqual(floor.bottom)
    expect(balcony.left).toBe(floor.left)
  })

  it('lines its items up in a row when horizontal', () => {
    const { floor, balcony } = renderSeats({ direction: 'horizontal' })
    expect(balcony.top).toBe(floor.top)
    expect(balcony.left).toBeGreaterThanOrEqual(floor.right)
  })
})
