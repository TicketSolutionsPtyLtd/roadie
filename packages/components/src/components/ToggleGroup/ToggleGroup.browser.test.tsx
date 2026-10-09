import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { ToggleGroup, type ToggleGroupProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { useStylesheet } from '../Pane/testUtils'
import { Toggle } from '../Toggle'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  setHoverCapable(true)
  await userEvent.unhover(document.body)
  cleanup()
})

const EMPHASES = ['normal', 'subtle', 'subtler'] as const

function DateRange(props: Omit<ToggleGroupProps, 'children'>) {
  return (
    <ToggleGroup aria-label='Date range' defaultValue={['30d']} {...props}>
      <ToggleGroup.Item value='7d'>7 days</ToggleGroup.Item>
      <ToggleGroup.Item value='30d'>30 days</ToggleGroup.Item>
      <ToggleGroup.Item value='90d'>Last 90 days</ToggleGroup.Item>
    </ToggleGroup>
  )
}

const indicator = () =>
  document.querySelector<HTMLElement>('[data-slot="toggle-group-indicator"]')!

function rectOf(element: Element) {
  const { left, top, width, height } = element.getBoundingClientRect()
  return { left, top, width, height }
}

function gap(pill: DOMRect, item: DOMRect) {
  return Math.max(
    Math.abs(pill.left - item.left),
    Math.abs(pill.top - item.top),
    Math.abs(pill.width - item.width),
    Math.abs(pill.height - item.height)
  )
}

// The pill animates between items, so wait for it to settle.
async function expectPillOver(name: string) {
  const item = screen.getByRole('button', { name })
  await expect
    .poll(
      () =>
        gap(indicator().getBoundingClientRect(), item.getBoundingClientRect()),
      { timeout: 5000 }
    )
    .toBeLessThan(1)
}

const NARROW = 160

function NarrowDateRange(props: Omit<ToggleGroupProps, 'children'>) {
  return (
    <div style={{ width: NARROW }}>
      <DateRange {...props} />
    </div>
  )
}

function expectWholeLabel(item: HTMLElement) {
  expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth)
}

async function expectInView(name: string) {
  const item = screen.getByRole('button', { name })
  expectWholeLabel(item)
  const frame = screen.getByRole('group').parentElement!
  await expect
    .poll(
      () => {
        const shown = frame.getBoundingClientRect()
        const { left, right } = item.getBoundingClientRect()
        return left >= shown.left - 0.5 && right <= shown.right + 0.5
      },
      { timeout: 5000 }
    )
    .toBe(true)
}

describe.each(EMPHASES)('the %s sliding pill', (emphasis) => {
  it('sits over the pressed item', async () => {
    render(<DateRange emphasis={emphasis} />)
    await expectPillOver('30 days')
  })

  it('fills the pill differently from the track', async () => {
    render(<DateRange emphasis={emphasis} />)
    await expectPillOver('30 days')
    const fill = (element: Element) => getComputedStyle(element).backgroundColor
    expect(fill(indicator())).not.toBe(fill(screen.getByRole('group')))
  })

  it('sets the pressed label apart from the rest, hovered or not', async () => {
    render(<DateRange emphasis={emphasis} />)
    const pressed = screen.getByRole('button', { name: '30 days' })
    const rest = screen.getByRole('button', { name: '7 days' })
    const colour = (element: Element) => getComputedStyle(element).color
    await expect.poll(() => colour(pressed)).not.toBe(colour(rest))
    if (emphasis !== 'subtler') {
      await expect.poll(() => colour(pressed)).toBe(colour(indicator()))
    }
    const atRest = colour(pressed)
    await userEvent.hover(pressed)
    await expect.poll(() => colour(pressed)).toBe(atRest)
  })

  it('moves to the newly pressed item', async () => {
    render(<DateRange emphasis={emphasis} />)
    await expectPillOver('30 days')
    const before = rectOf(indicator())

    await userEvent.click(screen.getByRole('button', { name: 'Last 90 days' }))
    await expectPillOver('Last 90 days')
    expect(rectOf(indicator()).left).toBeGreaterThan(before.left)
  })

  it('resizes with a content-sized item', async () => {
    render(<DateRange emphasis={emphasis} className='flex' />)
    await expectPillOver('30 days')
    const before = rectOf(indicator())

    await userEvent.click(screen.getByRole('button', { name: 'Last 90 days' }))
    await expectPillOver('Last 90 days')
    expect(rectOf(indicator()).width).toBeGreaterThan(before.width)
  })

  it('follows the pressed item down a vertical group', async () => {
    render(<DateRange emphasis={emphasis} direction='vertical' />)
    await expectPillOver('30 days')
    const before = rectOf(indicator())

    await userEvent.click(screen.getByRole('button', { name: '7 days' }))
    await expectPillOver('7 days')
    expect(rectOf(indicator()).top).toBeLessThan(before.top)
  })

  it('scrolls sideways on one row when space runs out', async () => {
    render(<NarrowDateRange emphasis={emphasis} />)
    const group = screen.getByRole('group')
    const items = screen.getAllByRole('button')
    expect(new Set(items.map((item) => rectOf(item).top)).size).toBe(1)
    items.forEach(expectWholeLabel)
    expect(rectOf(group).width).toBeLessThanOrEqual(NARROW)
    expect(group.scrollWidth).toBeGreaterThan(group.clientWidth)
  })

  it('scrolls the pressed item into view', async () => {
    render(<NarrowDateRange emphasis={emphasis} defaultValue={['90d']} />)
    await expectInView('Last 90 days')
    await expectPillOver('Last 90 days')
  })

  it('reaches the last item from the keyboard', async () => {
    render(<NarrowDateRange emphasis={emphasis} defaultValue={['7d']} />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{Enter}')
    expect(screen.getByRole('button', { name: 'Last 90 days' })).toHaveFocus()
    await expectInView('Last 90 days')
    await expectPillOver('Last 90 days')
  })

  it('keeps the focus ring inside the scrolling track', async () => {
    const removeStill = useStylesheet('* { transition: none !important }')
    render(<NarrowDateRange emphasis={emphasis} />)
    await userEvent.tab()
    const item = screen.getByRole('button', { name: '30 days' })
    expect(item).toHaveFocus()
    const group = screen.getByRole('group')
    const ring = () => {
      const { outlineWidth, outlineOffset } = getComputedStyle(item)
      return parseFloat(outlineWidth) + parseFloat(outlineOffset)
    }
    removeStill()
    const clipTop = group.getBoundingClientRect().top + group.clientTop
    const clipBottom = clipTop + group.clientHeight
    const { top, bottom } = item.getBoundingClientRect()
    expect(top - ring()).toBeGreaterThanOrEqual(clipTop - 0.5)
    expect(bottom + ring()).toBeLessThanOrEqual(clipBottom + 0.5)
  })
})

it('keeps the same height at every emphasis', () => {
  render(
    <>
      {EMPHASES.map((emphasis) => (
        <DateRange key={emphasis} emphasis={emphasis} />
      ))}
    </>
  )
  const heights = screen
    .getAllByRole('group')
    .map((group) => group.getBoundingClientRect().height)
  expect(new Set(heights).size).toBe(1)
})

function look(element: Element) {
  const { color, backgroundColor, boxShadow, transform } =
    getComputedStyle(element)
  return { color, backgroundColor, boxShadow, transform }
}

describe('a tap on a touch screen', () => {
  let removeStill = () => {}
  beforeAll(() => {
    removeStill = useStylesheet(
      '*, *::before, *::after { transition: none !important }'
    )
  })
  afterAll(() => removeStill())

  it.each(EMPHASES)(
    'leaves no hover on a %s group item, pressed or not',
    async (emphasis) => {
      setHoverCapable(false)
      render(<DateRange emphasis={emphasis} />)
      await expectPillOver('30 days')
      for (const name of ['7 days', '30 days']) {
        const item = screen.getByRole('button', { name })
        const rest = look(item)
        await userEvent.hover(item)
        expect(item.matches(':hover')).toBe(true)
        await expect.poll(() => look(item)).toEqual(rest)
      }
    }
  )

  it('leaves no hover on a pressed or unpressed Toggle', async () => {
    setHoverCapable(false)
    render(
      <>
        <Toggle>Notify me</Toggle>
        <Toggle defaultPressed>Presale alerts</Toggle>
      </>
    )
    for (const name of ['Notify me', 'Presale alerts']) {
      const toggle = screen.getByRole('button', { name })
      const rest = look(toggle)
      await userEvent.hover(toggle)
      expect(toggle.matches(':hover')).toBe(true)
      await expect.poll(() => look(toggle)).toEqual(rest)
    }
  })
})
