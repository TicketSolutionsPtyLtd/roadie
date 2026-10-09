import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import { Navigator } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Pane } from '../Pane'
import { forgetPaneScroll } from '../Pane/paneScroll'
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
afterEach(() => {
  cleanup()
  forgetPaneScroll()
})

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

describe('the pinned circle', () => {
  afterEach(() => commands.reduceMotion(false))

  const pinnedParts = (bar: HTMLElement) => {
    const circle = bar.querySelector<HTMLElement>(
      '[data-slot="navigator-primary-circle"] button'
    )!
    const mark = circle.querySelector(
      '[data-slot="navigator-tab-icon-frame"] > *'
    )!
    return { circle, mark }
  }

  it('shrinks to the 3.5rem edge circle when collapsed, anchored to its corner, keeping its icon size', async () => {
    const { bar, scroller } = renderBar()
    await settle()
    const { circle, mark } = pinnedParts(bar)
    const before = circle.getBoundingClientRect()
    const icon = mark.getBoundingClientRect()

    scroller.scrollTop = 400
    scroller.dispatchEvent(new Event('scroll'))
    await settle()

    const after = circle.getBoundingClientRect()
    expect(before.width).toBeCloseTo(66, 0)
    expect(after.width).toBeCloseTo(56, 0)
    expect(after.height).toBeCloseTo(56, 0)
    expect(after.right).toBeCloseTo(before.right, 0)
    expect(after.bottom).toBeCloseTo(before.bottom, 0)
    expect(mark.getBoundingClientRect().width).toBeCloseTo(icon.width, 0)
    expect(mark.getBoundingClientRect().height).toBeCloseTo(icon.height, 0)
  })

  it('snaps to the edge circle for someone who reduces motion', async () => {
    await commands.reduceMotion(true)
    const { bar, scroller } = renderBar()
    await settle()
    const { circle, mark } = pinnedParts(bar)

    scroller.scrollTop = 400
    scroller.dispatchEvent(new Event('scroll'))
    await frames(2)

    expect(circle.getBoundingClientRect().width).toBeCloseTo(56, 0)
    expect(mark.getBoundingClientRect().width).toBeCloseTo(28, 0)
  })
})

// A colour with no alpha component is opaque.
const alpha = (colour: string) =>
  Number(/\/\s*([\d.]+)\s*\)$/.exec(colour)?.[1] ?? 1)

describe('the phone bar pill', () => {
  afterEach(() => commands.reduceTransparency(false))

  const pill = () => {
    const { bar } = renderBar()
    return getComputedStyle(
      bar.querySelector('[data-slot="navigator-primary-pill"]')!
    )
  }

  it('blurs the page scrolling behind it through a translucent fill', async () => {
    const style = pill()

    expect(style.backdropFilter).toBe('blur(12px)')
    expect(alpha(style.backgroundColor)).toBeCloseTo(0.85, 2)
  })

  it('goes solid for someone who reduces transparency', async ({ skip }) => {
    if (!(await commands.reduceTransparency(true)))
      skip('Only Chromium can emulate reduced transparency')
    const style = pill()

    expect(style.backdropFilter).toBe('none')
    expect(alpha(style.backgroundColor)).toBe(1)
  })
})
