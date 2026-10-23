import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'

import { RadioGroup, type RadioGroupProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Checkbox } from '../Checkbox'
import { Field } from '../Field'
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

describe('RadioGroup spacing', () => {
  it('tightens the gap between stacked items as size drops', () => {
    const gap = (size: 'sm' | 'md' | 'lg') => {
      render(
        <RadioGroup size={size}>
          <RadioGroup.Item value='rock' label='Rock' />
          <RadioGroup.Item value='jazz' label='Jazz' />
        </RadioGroup>
      )
      const row = (name: string) =>
        screen
          .getByRole('radio', { name })
          .closest('[data-slot="radio-group-item"]')!
          .getBoundingClientRect()
      const between = row('Jazz').top - row('Rock').bottom
      cleanup()
      return between
    }
    const [sm, md, lg] = [gap('sm'), gap('md'), gap('lg')]
    expect(sm).toBeGreaterThan(0)
    expect(sm).toBeLessThanOrEqual(2)
    expect(md).toBeGreaterThan(sm)
    expect(lg).toBeGreaterThan(md)
  })
})

describe('RadioGroup disabled', () => {
  const row = (name: string) =>
    screen
      .getByRole('radio', { name })
      .closest('[data-slot="radio-group-item"]')!

  it.each([
    ['a disabled group', { disabled: true }, {}],
    ['a disabled item', {}, { disabled: true }]
  ] as const)('dims %s and ignores presses on it', (_, group, item) => {
    render(
      <RadioGroup {...group}>
        <RadioGroup.Item value='floor' label='Floor' {...item} />
      </RadioGroup>
    )
    const style = getComputedStyle(row('Floor'))
    expect(style.opacity).toBe('0.5')
    expect(style.pointerEvents).toBe('none')
  })
})

describe('RadioGroup colour', () => {
  const items = (
    <>
      <RadioGroup.Item value='floor' label='Floor' />
      <RadioGroup.Item value='balcony' label='Balcony' />
    </>
  )

  function expectFilledLike(circle: HTMLElement, swatch: HTMLElement) {
    const fill = getComputedStyle(swatch)
    expect(getComputedStyle(circle).backgroundColor).toBe(fill.backgroundColor)
    expect(getComputedStyle(circle).borderColor).toBe(fill.backgroundColor)
    expect(getComputedStyle(circle.firstElementChild!).backgroundColor).toBe(
      fill.color
    )
    expect(getComputedStyle(circle).boxShadow).not.toContain('inset')
  }

  it('fills the chosen circle like a ticked checkbox, whatever the intent around it', () => {
    render(
      <div className='intent-brand-secondary'>
        <Checkbox label='Rock' defaultChecked />
        <RadioGroup defaultValue='floor'>{items}</RadioGroup>
      </div>
    )
    const ticked = getComputedStyle(
      screen.getByRole('checkbox', { name: 'Rock' })
    )
    const tick = getComputedStyle(
      screen.getByRole('checkbox', { name: 'Rock' }).querySelector('svg')!
    )
    const chosen = screen.getByRole('radio', { name: 'Floor' })
    expect(getComputedStyle(chosen).backgroundColor).toBe(
      ticked.backgroundColor
    )
    expect(getComputedStyle(chosen).borderColor).toBe(ticked.borderColor)
    expect(getComputedStyle(chosen.firstElementChild!).backgroundColor).toBe(
      tick.color
    )
    expect(getComputedStyle(chosen).boxShadow).toBe(ticked.boxShadow)
  })

  it('fills the chosen circle with the accent strong colour, dot in its label colour', () => {
    render(
      <>
        <span data-testid='strong' className='emphasis-strong intent-accent'>
          Strong
        </span>
        <RadioGroup defaultValue='floor'>{items}</RadioGroup>
      </>
    )
    expectFilledLike(
      screen.getByRole('radio', { name: 'Floor' }),
      screen.getByTestId('strong')
    )
  })

  it('keeps an empty circle sunken', () => {
    render(<RadioGroup defaultValue='floor'>{items}</RadioGroup>)
    expect(
      getComputedStyle(screen.getByRole('radio', { name: 'Balcony' })).boxShadow
    ).toContain('inset')
  })
})

describe('RadioGroup invalid', () => {
  const items = (
    <>
      <RadioGroup.Item value='floor' label='Floor' />
      <RadioGroup.Item value='balcony' label='Balcony' />
    </>
  )

  function expectDangerCircles() {
    const danger = getComputedStyle(screen.getByTestId('danger'))
    const emptyBox = getComputedStyle(
      screen.getByRole('checkbox', { name: 'Rock' })
    )
    const chosen = screen.getByRole('radio', { name: 'Floor' })
    const empty = screen.getByRole('radio', { name: 'Balcony' })
    expect(getComputedStyle(empty).borderColor).toBe(emptyBox.borderColor)
    expect(getComputedStyle(empty).backgroundColor).toBe(
      emptyBox.backgroundColor
    )
    expect(getComputedStyle(chosen).backgroundColor).toBe(
      danger.backgroundColor
    )
    expect(getComputedStyle(chosen).borderColor).toBe(danger.backgroundColor)
    expect(getComputedStyle(chosen.firstElementChild!).backgroundColor).toBe(
      danger.color
    )
  }

  const swatches = (
    <>
      <span data-testid='danger' className='emphasis-strong intent-danger'>
        Danger
      </span>
      <Checkbox label='Rock' invalid />
    </>
  )

  it('fills the chosen circle with danger and tints the rest like an invalid checkbox', () => {
    render(
      <>
        {swatches}
        <RadioGroup invalid defaultValue='floor'>
          {items}
        </RadioGroup>
      </>
    )
    expectDangerCircles()
  })

  it('tints the empty circles like an invalid checkbox in dark mode', () => {
    document.documentElement.classList.add('dark')
    onTestFinished(() => document.documentElement.classList.remove('dark'))
    render(
      <>
        {swatches}
        <RadioGroup invalid defaultValue='floor'>
          {items}
        </RadioGroup>
      </>
    )
    expectDangerCircles()
  })

  it('draws danger circles when its Field is invalid', () => {
    render(
      <>
        {swatches}
        <Field invalid>
          <RadioGroup defaultValue='floor'>{items}</RadioGroup>
        </Field>
      </>
    )
    expectDangerCircles()
  })

  it('colours the focus ring danger, as an invalid field does', () => {
    render(
      <>
        <input className='is-interactive-field' aria-invalid='true' />
        <RadioGroup invalid>{items}</RadioGroup>
      </>
    )
    const field = screen.getByRole('textbox')
    const circle = screen.getByRole('radio', { name: 'Floor' })
    expect(getComputedStyle(circle).outlineColor).toBe(
      getComputedStyle(field).outlineColor
    )
  })
})
