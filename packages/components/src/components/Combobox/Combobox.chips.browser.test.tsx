import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Combobox } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
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
afterEach(() => cleanup())

const bands = [
  'The Midnight Paddock',
  'Saltwater Choir',
  'Velvet Kingfisher',
  'The Copper Lanterns',
  'Northbound Static'
]

function Bands({
  defaultValue,
  disabled,
  size
}: {
  defaultValue: string[]
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <div style={{ width: 320 }}>
      <Combobox
        items={bands}
        multiple
        defaultValue={defaultValue}
        disabled={disabled}
      >
        <Combobox.InputGroup data-testid='group' size={size}>
          <Combobox.Value>
            {(value: string[]) => (
              <Combobox.Chips>
                {value.map((band) => (
                  <Combobox.Chip key={band} aria-label={band}>
                    <Combobox.ChipLabel>{band}</Combobox.ChipLabel>
                    <Combobox.ChipRemove aria-label={`Remove ${band}`} />
                  </Combobox.Chip>
                ))}
                <Combobox.Input aria-label='Bands' />
              </Combobox.Chips>
            )}
          </Combobox.Value>
        </Combobox.InputGroup>
      </Combobox>
    </div>
  )
}

const box = (element: Element) => element.getBoundingClientRect()
const chip = (name: string) =>
  document.querySelector(`[data-slot=combobox-chip][aria-label="${name}"]`)!

describe('Combobox chips', () => {
  it.each([
    ['sm', 32],
    ['md', 40],
    ['lg', 48]
  ] as const)(
    'keep the size-%s height while they fit on one line',
    (size, height) => {
      render(<Bands defaultValue={['Saltwater Choir']} size={size} />)
      const group = box(screen.getByTestId('group'))
      expect(group.height).toBe(height)
      const offset = box(chip('Saltwater Choir')).top - group.top
      cleanup()
      render(<Bands defaultValue={bands} size={size} />)
      const wrapped = box(screen.getByTestId('group'))
      expect(wrapped.height).toBeGreaterThan(height)
      expect(box(chip(bands[0]!)).top - wrapped.top).toBeCloseTo(offset, 0)
    }
  )

  it('truncate a long label inside the chip, keeping its remove button', () => {
    const long =
      'The Midnight Paddock Collective and the Very Long Name Orchestra'
    render(<Bands defaultValue={[long]} />)
    const group = box(screen.getByTestId('group'))
    const chipBox = box(chip(long))
    const remove = box(screen.getByRole('button', { name: `Remove ${long}` }))
    expect(chipBox.right).toBeLessThanOrEqual(group.right)
    expect(remove.right).toBeLessThanOrEqual(chipBox.right)
    expect(remove.width).toBeGreaterThan(0)
  })

  it('take a press just outside the remove button', () => {
    render(<Bands defaultValue={['Saltwater Choir']} />)
    const remove = screen.getByRole('button', {
      name: 'Remove Saltwater Choir'
    })
    const { left, top, height } = box(remove)
    const hit = document.elementFromPoint(left - 1, top + height / 2)
    expect(remove.contains(hit)).toBe(true)
  })

  it('wrap onto new lines and grow the input group', () => {
    render(<Bands defaultValue={bands} />)
    const group = box(screen.getByTestId('group'))
    expect(group.height).toBeGreaterThan(40)
    for (const name of bands) {
      const chipBox = box(chip(name))
      expect(chipBox.left).toBeGreaterThanOrEqual(group.left)
      expect(chipBox.right).toBeLessThanOrEqual(group.right)
      expect(chipBox.bottom).toBeLessThanOrEqual(group.bottom)
    }
  })

  it('keep room to type after the last chip', () => {
    render(<Bands defaultValue={bands} />)
    expect(
      box(screen.getByRole('combobox', { name: 'Bands' })).width
    ).toBeGreaterThanOrEqual(64)
  })

  it('sit inside the input group with a fill of their own', () => {
    render(<Bands defaultValue={['Saltwater Choir']} />)
    const fill = getComputedStyle(chip('Saltwater Choir')).backgroundColor
    expect(fill).not.toBe(
      getComputedStyle(screen.getByTestId('group')).backgroundColor
    )
    expect(fill).not.toBe('rgba(0, 0, 0, 0)')
  })

  it('show a focus ring on the chip the arrow keys move to', async () => {
    render(<Bands defaultValue={['Saltwater Choir', 'Velvet Kingfisher']} />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowLeft}')
    const focused = chip('Velvet Kingfisher')
    await expect.poll(() => document.activeElement).toBe(focused)
    expect(parseFloat(getComputedStyle(focused).outlineWidth)).toBeGreaterThan(
      0
    )
  })

  it('remove a value with Backspace and return focus to the input', async () => {
    render(<Bands defaultValue={['Saltwater Choir', 'Velvet Kingfisher']} />)
    const input = screen.getByRole('combobox', { name: 'Bands' })
    await userEvent.tab()
    await userEvent.keyboard('{Backspace}')
    await expect
      .poll(() => document.querySelectorAll('[data-slot=combobox-chip]').length)
      .toBe(1)
    expect(document.activeElement).toBe(input)
  })

  it('fade once with the input group when disabled', () => {
    render(<Bands defaultValue={['Saltwater Choir']} disabled />)
    const remove = screen.getByRole('button', {
      name: 'Remove Saltwater Choir'
    })
    for (const part of [chip('Saltwater Choir'), remove]) {
      expect(getComputedStyle(part).opacity).toBe('1')
      expect(getComputedStyle(part).filter).toBe('none')
    }
    expect(getComputedStyle(screen.getByTestId('group')).opacity).toBe('0.5')
  })
})
