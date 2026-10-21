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

function measureRadio(name: string) {
  const circle = screen.getByRole('radio', { name })
  return {
    circle: circle.getBoundingClientRect(),
    dot: circle.firstElementChild?.getBoundingClientRect(),
    row: circle
      .closest('[data-slot="radio-group-item"]')!
      .getBoundingClientRect()
  }
}

describe('RadioGroup size', () => {
  it.each([
    ['sm', 16],
    [undefined, 20],
    ['md', 20],
    ['lg', 24]
  ] as const)(
    'size %s draws a %ipx circle, its dot half as wide',
    (size, circle) => {
      render(
        <RadioGroup size={size} defaultValue='floor'>
          <RadioGroup.Item value='floor' label='Floor' />
        </RadioGroup>
      )
      const rects = measureRadio('Floor')
      expect(rects.circle.width).toBe(circle)
      expect(rects.circle.height).toBe(circle)
      expect(rects.dot?.width).toBe(circle / 2)
    }
  )

  it('sets a larger label at lg only', () => {
    render(
      <>
        <RadioGroup size='sm'>
          <RadioGroup.Item value='a' label='Small' />
        </RadioGroup>
        <RadioGroup size='md'>
          <RadioGroup.Item value='a' label='Medium' />
        </RadioGroup>
        <RadioGroup size='lg'>
          <RadioGroup.Item value='a' label='Large' />
        </RadioGroup>
      </>
    )
    const fontSize = (text: string) =>
      parseFloat(getComputedStyle(screen.getByText(text)).fontSize)
    expect(fontSize('Small')).toBe(fontSize('Medium'))
    expect(fontSize('Large')).toBeGreaterThan(fontSize('Medium'))
  })

  it('keeps an sm row at least 24px tall', () => {
    render(
      <RadioGroup size='sm'>
        <RadioGroup.Item value='floor' label='Floor' />
      </RadioGroup>
    )
    expect(measureRadio('Floor').row.height).toBeGreaterThanOrEqual(24)
  })
})

describe('RadioGroup.Item trailing', () => {
  it('keeps the count in view beside a long unbroken label', () => {
    render(
      <div data-testid='frame' style={{ width: 240 }}>
        <RadioGroup>
          <RadioGroup.Item
            value='long'
            label='Supercalifragilisticexpialidocious_unbroken_date_range'
            trailing='1,284,903'
          />
        </RadioGroup>
      </div>
    )
    const frame = screen.getByTestId('frame').getBoundingClientRect()
    const { row } = measureRadio(
      'Supercalifragilisticexpialidocious_unbroken_date_range'
    )
    const count = screen.getByText('1,284,903').getBoundingClientRect()
    const labelText = document.createRange()
    labelText.selectNodeContents(
      screen.getByText('Supercalifragilisticexpialidocious_unbroken_date_range')
    )
    expect(row.right).toBeLessThanOrEqual(frame.right)
    expect(count.right).toBeLessThanOrEqual(frame.right)
    expect(labelText.getBoundingClientRect().right).toBeLessThanOrEqual(
      count.left
    )
  })

  it('sits at the end of the row, after the label', () => {
    render(
      <div style={{ width: 240 }}>
        <RadioGroup>
          <RadioGroup.Item value='upcoming' label='Upcoming' trailing='84' />
        </RadioGroup>
      </div>
    )
    const { row } = measureRadio('Upcoming')
    const label = screen.getByText('Upcoming').getBoundingClientRect()
    const count = screen.getByText('84').getBoundingClientRect()
    expect(count.left).toBeGreaterThan(label.right)
    expect(row.right - count.right).toBeLessThanOrEqual(8)
  })
})

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
