import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Checkbox, type CheckboxProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { CheckboxGroup } from '../CheckboxGroup'
import { Field } from '../Field'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

function measure(name: string) {
  const box = screen.getByRole('checkbox', { name })
  const row = box.closest('[data-slot="checkbox"]')!
  return {
    box: box.getBoundingClientRect(),
    icon: box.querySelector('svg')?.getBoundingClientRect(),
    row: row.getBoundingClientRect()
  }
}

const SIZES: [NonNullable<CheckboxProps['size']> | undefined, number][] = [
  ['sm', 16],
  [undefined, 20],
  ['md', 20],
  ['lg', 24]
]

describe('Checkbox size', () => {
  it.each(SIZES)(
    'size %s draws a %ipx box, its icon 2px smaller',
    (size, box) => {
      render(<Checkbox size={size} label='Rock' defaultChecked />)
      const rects = measure('Rock')
      expect(rects.box.width).toBe(box)
      expect(rects.box.height).toBe(box)
      expect(rects.icon?.width).toBe(box - 2)
    }
  )

  it('keeps every row at least 24px tall, growing with size', () => {
    render(
      <>
        <Checkbox size='sm' label='Small' />
        <Checkbox size='md' label='Medium' />
        <Checkbox size='lg' label='Large' />
      </>
    )
    const sm = measure('Small').row.height
    const md = measure('Medium').row.height
    const lg = measure('Large').row.height
    expect(sm).toBeGreaterThanOrEqual(24)
    expect(md).toBeGreaterThan(sm)
    expect(lg).toBeGreaterThan(md)
  })

  it('sets a larger label at lg only', () => {
    render(
      <>
        <Checkbox size='sm' label='Small' />
        <Checkbox size='md' label='Medium' />
        <Checkbox size='lg' label='Large' />
      </>
    )
    const fontSize = (text: string) =>
      parseFloat(getComputedStyle(screen.getByText(text)).fontSize)
    expect(fontSize('Small')).toBe(fontSize('Medium'))
    expect(fontSize('Large')).toBeGreaterThan(fontSize('Medium'))
  })

  it('takes its size from the group, over its own', () => {
    render(
      <CheckboxGroup size='sm' defaultValue={['rock']}>
        <Checkbox value='rock' label='Rock' size='lg' />
      </CheckboxGroup>
    )
    expect(measure('Rock').box.width).toBe(16)
  })

  it('sizes the minus icon like the check', () => {
    render(<Checkbox size='sm' label='All genres' indeterminate />)
    expect(measure('All genres').icon?.width).toBe(14)
  })
})

describe('Checkbox colour', () => {
  it.each([
    ['ticked', { defaultChecked: true }],
    ['indeterminate', { indeterminate: true }]
  ] as const)(
    'fills a %s box with the accent strong colour, unsunken, whatever the intent around it',
    (_, state) => {
      render(
        <>
          <span data-testid='strong' className='emphasis-strong intent-accent'>
            Strong
          </span>
          <div className='intent-brand-secondary'>
            <Checkbox label='Rock' {...state} />
          </div>
        </>
      )
      const strong = getComputedStyle(screen.getByTestId('strong'))
      const box = screen.getByRole('checkbox', { name: 'Rock' })
      expect(getComputedStyle(box).backgroundColor).toBe(strong.backgroundColor)
      expect(getComputedStyle(box).borderColor).toBe(strong.backgroundColor)
      expect(getComputedStyle(box.querySelector('svg')!).color).toBe(
        strong.color
      )
      expect(getComputedStyle(box).boxShadow).not.toContain('inset')
    }
  )

  function expectDangerFill(box: HTMLElement) {
    const strong = getComputedStyle(screen.getByTestId('danger'))
    expect(getComputedStyle(box).backgroundColor).toBe(strong.backgroundColor)
    expect(getComputedStyle(box).borderColor).toBe(strong.backgroundColor)
    expect(getComputedStyle(box.querySelector('svg')!).color).toBe(strong.color)
  }

  const dangerSwatch = (
    <span data-testid='danger' className='emphasis-strong intent-danger'>
      Danger
    </span>
  )

  it.each([
    ['ticked', { defaultChecked: true }],
    ['indeterminate', { indeterminate: true }]
  ] as const)('fills an invalid %s box with danger', (_, state) => {
    render(
      <>
        {dangerSwatch}
        <Checkbox label='Rock' invalid {...state} />
      </>
    )
    expectDangerFill(screen.getByRole('checkbox', { name: 'Rock' }))
  })

  it('fills a ticked box with danger when its Field is invalid', () => {
    render(
      <>
        {dangerSwatch}
        <Field invalid>
          <Checkbox label='Agree' defaultChecked />
        </Field>
      </>
    )
    expectDangerFill(screen.getByRole('checkbox', { name: 'Agree' }))
  })

  it('keeps an empty box sunken', () => {
    render(<Checkbox label='Rock' />)
    expect(
      getComputedStyle(screen.getByRole('checkbox', { name: 'Rock' })).boxShadow
    ).toContain('inset')
  })
})

describe('Checkbox trailing', () => {
  it('keeps the count in view beside a long unbroken label', () => {
    const label = 'Supercalifragilisticexpialidocious_unbroken_venue_name'
    render(
      <div data-testid='frame' style={{ width: 240 }}>
        <Checkbox label={label} trailing='1,284,903' />
      </div>
    )
    const frame = screen.getByTestId('frame').getBoundingClientRect()
    const row = screen
      .getByRole('checkbox')
      .closest('[data-slot="checkbox"]')!
      .getBoundingClientRect()
    const count = screen.getByText('1,284,903').getBoundingClientRect()
    const labelText = document.createRange()
    labelText.selectNodeContents(screen.getByText(label))
    expect(row.right).toBeLessThanOrEqual(frame.right)
    expect(count.right).toBeLessThanOrEqual(frame.right)
    expect(labelText.getBoundingClientRect().right).toBeLessThanOrEqual(
      count.left
    )
  })

  it('sits at the end of the row, after the label', () => {
    render(
      <div style={{ width: 240 }}>
        <Checkbox label='Brisbane' trailing='12' />
      </div>
    )
    const row = screen
      .getByRole('checkbox', { name: 'Brisbane' })
      .closest('[data-slot="checkbox"]')!
      .getBoundingClientRect()
    const label = screen.getByText('Brisbane').getBoundingClientRect()
    const count = screen.getByText('12').getBoundingClientRect()
    expect(count.left).toBeGreaterThan(label.right)
    expect(row.right - count.right).toBeLessThanOrEqual(8)
  })
})
