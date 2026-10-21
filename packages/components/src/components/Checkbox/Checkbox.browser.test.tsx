import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Checkbox, type CheckboxProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { CheckboxGroup } from '../CheckboxGroup'
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

describe('Checkbox trailing', () => {
  it('keeps the count in view beside a long unbroken label', () => {
    render(
      <div data-testid='frame' style={{ width: 240 }}>
        <Checkbox
          label='Supercalifragilisticexpialidocious_unbroken_venue_name'
          trailing='1,284,903'
        />
      </div>
    )
    const frame = screen.getByTestId('frame').getBoundingClientRect()
    const row = screen
      .getByRole('checkbox')
      .closest('[data-slot="checkbox"]')!
      .getBoundingClientRect()
    const count = screen.getByText('1,284,903').getBoundingClientRect()
    expect(row.right).toBeLessThanOrEqual(frame.right)
    expect(count.right).toBeLessThanOrEqual(frame.right)
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
