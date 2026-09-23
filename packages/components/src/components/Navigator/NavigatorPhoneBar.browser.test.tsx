import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Navigator } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Pane } from '../Pane'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(390, 844)
})
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})
afterEach(() => cleanup())

const frames = (count = 4) =>
  new Promise<void>((settle) => {
    const step = (left: number) =>
      left === 0 ? settle() : requestAnimationFrame(() => step(left - 1))
    step(count)
  })

async function settle() {
  await frames()
  for (const animation of document.getAnimations()) animation.finish()
  await frames()
}

function renderBar() {
  const { container } = render(
    <div style={{ height: 844, display: 'grid' }}>
      <Navigator value='b'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='a'>A</Navigator.Item>
          <Navigator.Item value='b'>B</Navigator.Item>
          <Navigator.Item value='c'>C</Navigator.Item>
          <Navigator.Item value='account' placement='pinned'>
            Account
          </Navigator.Item>
        </Navigator.Primary>
        <Pane column='list'>
          <div style={{ height: 4000 }}>Content</div>
        </Pane>
      </Navigator>
    </div>
  )
  const bar = container.querySelector<HTMLElement>(
    '[data-slot="navigator-primary"][data-orientation="horizontal"]'
  )!
  const part = (slot: string) =>
    bar
      .querySelector<HTMLElement>(`[data-slot="${slot}"]`)!
      .getBoundingClientRect()
  const pinned = () =>
    bar
      .querySelector(
        '[data-slot="navigator-primary-circle"] button, [data-slot="navigator-primary-circle"] a'
      )!
      .getBoundingClientRect()
  const scroller = container.querySelector<HTMLElement>(
    '[data-slot="pane-viewport"]'
  )!
  return { bar, part, pinned, scroller }
}

describe('phone bar with a pinned item', () => {
  it('starts the tabs 1rem from the edge rather than centring them', async () => {
    const { bar, part } = renderBar()
    await settle()
    const edge = bar.getBoundingClientRect().left - 8

    expect(part('navigator-primary-track').left - edge).toBeCloseTo(16, 0)
  })

  it('holds the pinned circle 1rem from the edge, expanded and collapsed', async () => {
    const { bar, pinned, scroller } = renderBar()
    await settle()
    const edge = bar.getBoundingClientRect().right + 8

    expect(edge - pinned().right).toBeCloseTo(16, 0)

    scroller.scrollTop = 400
    scroller.dispatchEvent(new Event('scroll'))
    await settle()

    expect(bar).toHaveAttribute('data-collapsed', 'true')
    expect(edge - pinned().right).toBeCloseTo(16, 0)
  })

  it('floats the active tab 1rem from the start edge when collapsed', async () => {
    const { bar, scroller } = renderBar()
    await settle()
    const edge = bar.getBoundingClientRect().left - 8

    scroller.scrollTop = 400
    scroller.dispatchEvent(new Event('scroll'))
    await settle()

    const active = bar
      .querySelector('[data-circle-side="start"]')!
      .getBoundingClientRect()
    expect(active.left - edge).toBeCloseTo(16, 0)
  })
})
