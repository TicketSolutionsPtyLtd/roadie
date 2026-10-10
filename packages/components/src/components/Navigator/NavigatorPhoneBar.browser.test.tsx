import { cleanup, render } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'
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

function renderBar({
  dir = 'ltr',
  tabs = ['a', 'b', 'c'],
  pinned: withPinned = true
}: { dir?: 'ltr' | 'rtl'; tabs?: string[]; pinned?: boolean } = {}) {
  const { container } = render(
    <div dir={dir} style={{ height: 844, display: 'grid' }}>
      <Navigator value='b'>
        <Navigator.Primary aria-label='Primary'>
          {tabs.map((tab) => (
            <Navigator.Item key={tab} value={tab}>
              {tab.toUpperCase()}
            </Navigator.Item>
          ))}
          {withPinned ? (
            <Navigator.Item value='account' placement='pinned'>
              Account
            </Navigator.Item>
          ) : null}
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
  return { host: container.firstElementChild!, bar, part, pinned, scroller }
}

async function collapse(scroller: HTMLElement) {
  scroller.scrollTop = 400
  scroller.dispatchEvent(new Event('scroll'))
  await settle()
}

describe('the phone bar', () => {
  it('floats over the content, which runs the full height beneath it', async () => {
    const { host, bar, scroller } = renderBar()
    await settle()
    const content = scroller.getBoundingClientRect()

    expect(content.bottom).toBeCloseTo(host.getBoundingClientRect().bottom, 0)
    expect(bar.getBoundingClientRect().top).toBeGreaterThan(content.top)
    expect(bar.getBoundingClientRect().bottom).toBeLessThan(content.bottom)
  })

  it('leaves a wider screen to the side rail', async () => {
    await page.viewport(1000, 844)
    onTestFinished(() => page.viewport(390, 844))
    const { bar } = renderBar()
    await settle()

    expect(bar.getBoundingClientRect().height).toBe(0)
  })
})

describe('the More pane', () => {
  it.each([
    [390, true],
    [1000, false]
  ])(
    'at a %ipx viewport, lists the rows the phone bar folds: %s',
    async (width, listed) => {
      await page.viewport(width, 844)
      onTestFinished(() => page.viewport(390, 844))
      renderBar({ tabs: ['a', 'b', 'c', 'd', 'e', 'f'], pinned: false })
      await settle()
      const [barRows] = document.querySelectorAll(
        '[data-slot="pane"][id] [data-slot="navigator-overflow-items"]'
      )

      expect(getComputedStyle(barRows!).display !== 'none').toBe(listed)
    }
  )
})

describe('the collapsed edge circles', () => {
  it.each(['ltr', 'rtl'] as const)(
    'carry the active tab and More 1rem from the edges, %s',
    async (dir) => {
      const { host, bar, scroller } = renderBar({
        dir,
        tabs: ['a', 'b', 'c', 'd', 'e', 'f'],
        pinned: false
      })
      await settle()
      await collapse(scroller)
      const edges = host.getBoundingClientRect()
      const circle = (side: string) =>
        bar
          .querySelector(`[data-circle-side="${side}"]`)!
          .getBoundingClientRect()
      const fromStart = (box: DOMRect) =>
        dir === 'ltr' ? box.left - edges.left : edges.right - box.right
      const fromEnd = (box: DOMRect) =>
        dir === 'ltr' ? edges.right - box.right : box.left - edges.left

      expect(bar).toHaveAttribute('data-collapsed', 'true')
      expect(fromStart(circle('start'))).toBeCloseTo(16, 0)
      expect(fromEnd(circle('end'))).toBeCloseTo(16, 0)
    }
  )
})

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

  it.each(['ltr', 'rtl'] as const)(
    'shrinks to the 3.5rem edge circle when collapsed, anchored to its corner, keeping its icon size, %s',
    async (dir) => {
      const { bar, scroller } = renderBar({ dir })
      await settle()
      const { circle, mark } = pinnedParts(bar)
      const before = circle.getBoundingClientRect()
      const icon = mark.getBoundingClientRect()
      const outerEdge = (box: DOMRect) => (dir === 'ltr' ? box.right : box.left)

      await collapse(scroller)

      const after = circle.getBoundingClientRect()
      expect(before.width).toBeCloseTo(66, 0)
      expect(after.width).toBeCloseTo(56, 0)
      expect(after.height).toBeCloseTo(56, 0)
      expect(outerEdge(after)).toBeCloseTo(outerEdge(before), 0)
      expect(after.bottom).toBeCloseTo(before.bottom, 0)
      expect(mark.getBoundingClientRect().width).toBeCloseTo(icon.width, 0)
      expect(mark.getBoundingClientRect().height).toBeCloseTo(icon.height, 0)
    }
  )

  it('snaps to the edge circle for someone who reduces motion', async () => {
    await commands.reduceMotion(true)
    // Lifts core's global reset, so the snap must come from the Navigator's own guard.
    const restoreReset = useStylesheet(
      '@media (prefers-reduced-motion: reduce) { * { transition-duration: revert-layer !important } }'
    )
    onTestFinished(restoreReset)
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
