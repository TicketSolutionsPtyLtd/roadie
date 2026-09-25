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

// The pill animates between items, so wait for it to settle.
async function expectPillOver(name: string) {
  const item = screen.getByRole('button', { name })
  await expect
    .poll(() => {
      const pill = rectOf(indicator())
      const target = rectOf(item)
      return Object.keys(target).every(
        (key) =>
          Math.abs(
            pill[key as keyof typeof pill] - target[key as keyof typeof target]
          ) < 1
      )
    })
    .toBe(true)
}

describe('the sliding pill', () => {
  it('sits over the pressed item', async () => {
    render(<DateRange />)
    await expectPillOver('30 days')
  })

  it('moves to the newly pressed item', async () => {
    render(<DateRange />)
    await expectPillOver('30 days')
    const before = rectOf(indicator())

    await userEvent.click(screen.getByRole('button', { name: 'Last 90 days' }))
    await expectPillOver('Last 90 days')
    expect(rectOf(indicator()).left).toBeGreaterThan(before.left)
  })

  it('resizes with a content-sized item', async () => {
    render(<DateRange className='flex' />)
    await expectPillOver('30 days')
    const before = rectOf(indicator())

    await userEvent.click(screen.getByRole('button', { name: 'Last 90 days' }))
    await expectPillOver('Last 90 days')
    expect(rectOf(indicator()).width).toBeGreaterThan(before.width)
  })

  it('follows the pressed item down a vertical group', async () => {
    render(<DateRange direction='vertical' />)
    await expectPillOver('30 days')
    const before = rectOf(indicator())

    await userEvent.click(screen.getByRole('button', { name: '7 days' }))
    await expectPillOver('7 days')
    expect(rectOf(indicator()).top).toBeLessThan(before.top)
  })
})
