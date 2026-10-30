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
import { commands, userEvent } from 'vitest/browser'

import { Combobox } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { oklchLightness, shownFill } from '../../css/contrastTestUtils'
import { Button } from '../Button'
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
  size,
  chipClassName,
  selected,
  controls
}: {
  defaultValue: string[]
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  chipClassName?: string
  selected?: string
  controls?: boolean
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
                  <Combobox.Chip
                    key={band}
                    aria-label={band}
                    className={chipClassName}
                    selected={band === selected}
                  >
                    <Combobox.ChipLabel>{band}</Combobox.ChipLabel>
                    <Combobox.ChipRemove aria-label={`Remove ${band}`} />
                  </Combobox.Chip>
                ))}
                <Combobox.Input aria-label='Bands' />
              </Combobox.Chips>
            )}
          </Combobox.Value>
          {controls && (
            <>
              <Combobox.Clear aria-label='Clear bands' />
              <Combobox.Trigger aria-label='Show bands' />
            </>
          )}
        </Combobox.InputGroup>
      </Combobox>
    </div>
  )
}

const box = (element: Element) => element.getBoundingClientRect()
const chip = (name: string) =>
  document.querySelector(`[data-slot=combobox-chip][aria-label="${name}"]`)!

function look(element: Element) {
  const { backgroundColor, color, borderColor, boxShadow } =
    getComputedStyle(element)
  return { backgroundColor, color, borderColor, boxShadow }
}

function BandsBesideButton({
  chipClassName,
  selected
}: {
  chipClassName?: string
  selected?: string
}) {
  return (
    <>
      <Bands
        defaultValue={['Saltwater Choir', 'Velvet Kingfisher']}
        chipClassName={chipClassName}
        selected={selected}
      />
      <Button intent='accent' emphasis='strong'>
        Apply
      </Button>
    </>
  )
}

const button = () => screen.getByRole('button', { name: 'Apply' })
const input = () => screen.getByRole('combobox', { name: 'Bands' })

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

  it.each(['sm', 'md', 'lg'] as const)(
    'keep Clear and the trigger on the first row as chips wrap, at %s',
    (size) => {
      render(<Bands defaultValue={bands} size={size} controls />)
      const middle = (element: Element) => {
        const { top, height } = box(element)
        return top + height / 2
      }
      const firstRow = middle(chip(bands[0]!))
      for (const name of ['Clear bands', 'Show bands'])
        expect(middle(screen.getByRole('button', { name }))).toBeCloseTo(
          firstRow,
          0
        )
    }
  )

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

  it('select the last chip with Backspace from the input, then remove it', async () => {
    render(<Bands defaultValue={['Saltwater Choir', 'Velvet Kingfisher']} />)
    await userEvent.tab()
    await userEvent.keyboard('{Backspace}')
    await expect
      .poll(() => document.activeElement)
      .toBe(chip('Velvet Kingfisher'))
    await userEvent.keyboard('{Backspace}')
    await expect
      .poll(() => document.querySelectorAll('[data-slot=combobox-chip]').length)
      .toBe(1)
  })

  it('pad both ends alike without a remove button', () => {
    render(
      <Combobox items={bands} multiple defaultValue={['Saltwater Choir']}>
        <Combobox.Chips>
          <Combobox.Chip aria-label='Saltwater Choir'>
            <Combobox.ChipLabel>Saltwater Choir</Combobox.ChipLabel>
          </Combobox.Chip>
        </Combobox.Chips>
      </Combobox>
    )
    const style = getComputedStyle(chip('Saltwater Choir'))
    expect(parseFloat(style.paddingInlineStart)).toBeGreaterThan(2)
    expect(style.paddingInlineEnd).toBe(style.paddingInlineStart)
  })

  it('keep the end tight beside a remove button', () => {
    render(<Bands defaultValue={['Saltwater Choir']} />)
    const style = getComputedStyle(chip('Saltwater Choir'))
    expect(parseFloat(style.paddingInlineEnd)).toBeLessThan(
      parseFloat(style.paddingInlineStart)
    )
  })

  it('select a chip on click, looking like an accent strong Button', async () => {
    render(<BandsBesideButton />)
    await userEvent.click(screen.getByText('Saltwater Choir'))
    const selected = chip('Saltwater Choir')
    await expect.poll(() => document.activeElement).toBe(selected)
    await userEvent.hover(input())
    expect(look(selected)).toEqual(look(button()))
    expect(
      getComputedStyle(
        screen.getByRole('button', { name: 'Remove Saltwater Choir' })
      ).color
    ).toBe(getComputedStyle(button()).color)
  })

  it('select a chip with its own intent in accent', async () => {
    render(<BandsBesideButton chipClassName='intent-warning' />)
    await userEvent.click(screen.getByText('Saltwater Choir'))
    await expect
      .poll(() => document.activeElement)
      .toBe(chip('Saltwater Choir'))
    await userEvent.hover(input())
    expect(look(chip('Saltwater Choir'))).toEqual(look(button()))
  })

  it('hover a selected chip as an accent strong Button hovers', async () => {
    render(<BandsBesideButton />)
    await userEvent.click(screen.getByText('Saltwater Choir'))
    await expect
      .poll(() => document.activeElement)
      .toBe(chip('Saltwater Choir'))
    await userEvent.hover(chip('Saltwater Choir'))
    const hovered = look(chip('Saltwater Choir'))
    await userEvent.hover(button())
    expect(hovered).toEqual(look(button()))
  })

  it('press a selected chip as an accent strong Button presses', async () => {
    render(<BandsBesideButton />)
    const pressedFill = async (target: Element, shown: Element) => {
      const { left, top, width, height } = box(target)
      await commands.pointer([
        { type: 'move', x: left + width / 2, y: top + height / 2 },
        { type: 'down' }
      ])
      const { backgroundColor } = getComputedStyle(shown)
      await commands.pointer([{ type: 'up' }])
      return backgroundColor
    }
    await userEvent.click(screen.getByText('Saltwater Choir'))
    const selected = chip('Saltwater Choir')
    await expect.poll(() => document.activeElement).toBe(selected)
    expect(
      await pressedFill(screen.getByText('Saltwater Choir'), selected)
    ).toBe(await pressedFill(button(), button()))
  })

  it('show a keyboard-selected chip as an accent strong Button with keyboard focus', async () => {
    render(<BandsBesideButton />)
    await userEvent.click(input())
    await userEvent.tab()
    await expect.poll(() => document.activeElement).toBe(button())
    const focused = look(button())
    await userEvent.tab({ shift: true })
    await expect.poll(() => document.activeElement).toBe(input())
    await userEvent.keyboard('{Backspace}')
    await expect
      .poll(() => document.activeElement)
      .toBe(chip('Velvet Kingfisher'))
    expect(look(chip('Velvet Kingfisher'))).toEqual(focused)
  })

  it('keep a visible hover on the remove button inside a selected chip', async () => {
    render(<BandsBesideButton />)
    await userEvent.click(screen.getByText('Saltwater Choir'))
    await expect
      .poll(() => document.activeElement)
      .toBe(chip('Saltwater Choir'))
    const remove = screen.getByRole('button', {
      name: 'Remove Saltwater Choir'
    })
    await userEvent.hover(remove)
    const step =
      oklchLightness(shownFill(remove)) -
      oklchLightness(shownFill(chip('Saltwater Choir')))
    expect(Math.abs(step)).toBeGreaterThanOrEqual(0.05)
    expect(getComputedStyle(remove).color).toBe(
      getComputedStyle(button()).color
    )
  })

  it('edge a clicked chip in Highlight under forced colours', async (context) => {
    render(<Bands defaultValue={['Saltwater Choir', 'Velvet Kingfisher']} />)
    await userEvent.click(screen.getByText('Saltwater Choir'))
    await expect
      .poll(() => document.activeElement)
      .toBe(chip('Saltwater Choir'))
    await commands.forcedColors(true)
    onTestFinished(() => commands.forcedColors(false))
    if (!matchMedia('(forced-colors: active)').matches) {
      context.skip()
      return
    }
    const edge = (element: Element) => getComputedStyle(element).borderTopColor
    expect(edge(chip('Saltwater Choir'))).not.toBe(
      edge(chip('Velvet Kingfisher'))
    )
  })

  it('mark a chip selected while focus stays in the input, looking like an accent strong Button', async () => {
    render(
      <BandsBesideButton
        selected='Saltwater Choir'
        chipClassName='intent-warning'
      />
    )
    await userEvent.click(input())
    await userEvent.hover(input())
    const selected = chip('Saltwater Choir')
    expect(document.activeElement).toBe(input())
    expect(selected).toHaveAttribute('data-selected')
    expect(look(selected)).toEqual(look(button()))
    expect(look(chip('Velvet Kingfisher'))).not.toEqual(look(button()))
    expect(
      getComputedStyle(
        screen.getByRole('button', { name: 'Remove Saltwater Choir' })
      ).color
    ).toBe(getComputedStyle(button()).color)
  })

  it('edge a selected chip in Highlight under forced colours', async (context) => {
    render(
      <Bands
        defaultValue={['Saltwater Choir', 'Velvet Kingfisher']}
        selected='Saltwater Choir'
      />
    )
    await commands.forcedColors(true)
    onTestFinished(() => commands.forcedColors(false))
    if (!matchMedia('(forced-colors: active)').matches) {
      context.skip()
      return
    }
    const edge = (element: Element) => getComputedStyle(element).borderTopColor
    expect(edge(chip('Saltwater Choir'))).not.toBe(
      edge(chip('Velvet Kingfisher'))
    )
  })

  it('move focus to the next chip after removing a focused one, then to the input', async () => {
    render(
      <Bands
        defaultValue={[
          'Saltwater Choir',
          'Velvet Kingfisher',
          'Northbound Static'
        ]}
      />
    )
    await userEvent.tab()
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    await expect
      .poll(() => document.activeElement)
      .toBe(chip('Velvet Kingfisher'))
    await userEvent.keyboard('{Backspace}')
    await expect
      .poll(() => document.activeElement)
      .toBe(chip('Northbound Static'))
    await userEvent.keyboard('{Backspace}')
    await expect
      .poll(() => document.activeElement)
      .toBe(chip('Saltwater Choir'))
    await userEvent.keyboard('{Backspace}')
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('combobox', { name: 'Bands' }))
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
