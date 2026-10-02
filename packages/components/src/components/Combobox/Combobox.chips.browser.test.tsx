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
  disabled
}: {
  defaultValue: string[]
  disabled?: boolean
}) {
  return (
    <div style={{ width: 320 }}>
      <Combobox
        items={bands}
        multiple
        defaultValue={defaultValue}
        disabled={disabled}
      >
        <Combobox.InputGroup data-testid='group'>
          <Combobox.Value>
            {(value: string[]) => (
              <Combobox.Chips>
                {value.map((band) => (
                  <Combobox.Chip key={band} aria-label={band}>
                    {band}
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
  it('keep the size-md height while they fit on one line', () => {
    render(<Bands defaultValue={['Saltwater Choir']} />)
    expect(box(screen.getByTestId('group')).height).toBe(40)
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
    await userEvent.click(screen.getByRole('combobox', { name: 'Bands' }))
    await userEvent.keyboard('{Escape}{ArrowLeft}')
    const focused = chip('Velvet Kingfisher')
    await expect.poll(() => document.activeElement).toBe(focused)
    expect(parseFloat(getComputedStyle(focused).outlineWidth)).toBeGreaterThan(
      0
    )
  })

  it('remove a value with Backspace and return focus to the input', async () => {
    render(<Bands defaultValue={['Saltwater Choir', 'Velvet Kingfisher']} />)
    const input = screen.getByRole('combobox', { name: 'Bands' })
    await userEvent.click(input)
    await userEvent.keyboard('{Escape}{Backspace}')
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
