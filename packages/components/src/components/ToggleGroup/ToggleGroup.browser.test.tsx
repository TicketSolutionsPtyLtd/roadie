import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { ToggleGroup, type ToggleGroupProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const EMPHASES = ['strong', 'normal', 'subtle', 'subtler'] as const

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
    if (emphasis === 'strong') {
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
