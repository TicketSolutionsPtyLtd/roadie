import type { ReactNode } from 'react'

import { cleanup, render, within } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi
} from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { Navigator } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Pane } from '../Pane'
import { forgetPaneScroll } from '../Pane/paneScroll'
import { useStylesheet } from '../Pane/testUtils'
import { withStubLink } from './testUtils'
import { NAV_COLLAPSE_THRESHOLD } from './useTopPaneChrome'

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

const tall = <div style={{ height: 4000 }}>Content</div>

function renderBar({
  dir = 'ltr',
  tabs = ['a', 'b', 'c'],
  pinned: withPinned = true,
  value = 'b',
  onValueChange,
  menu,
  panes = <Pane column='list'>{tall}</Pane>
}: {
  dir?: 'ltr' | 'rtl'
  tabs?: string[]
  pinned?: boolean
  value?: string
  onValueChange?: (value: string) => void
  menu?: string
  panes?: ReactNode
} = {}) {
  const { container } = render(
    <div dir={dir} style={{ height: 844, display: 'grid' }}>
      <Navigator value={value} onValueChange={onValueChange}>
        <Navigator.Primary aria-label='Primary'>
          {tabs.map((tab) => (
            <Navigator.Item key={tab} value={tab}>
              {tab.toUpperCase()}
              {tab === menu ? (
                <Navigator.Menu>
                  <Navigator.MenuItem>Menu item</Navigator.MenuItem>
                </Navigator.Menu>
              ) : null}
            </Navigator.Item>
          ))}
          {withPinned ? (
            <Navigator.Item value='account' placement='pinned'>
              Account
            </Navigator.Item>
          ) : null}
        </Navigator.Primary>
        {panes}
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

async function scrollTo(scroller: HTMLElement, top: number) {
  scroller.scrollTop = top
  scroller.dispatchEvent(new Event('scroll'))
  await settle()
}

const collapse = (scroller: HTMLElement) => scrollTo(scroller, 400)

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

describe('the bar on scroll', () => {
  it('collapses once the top pane scrolls past its threshold, and expands back within it', async () => {
    const { bar, scroller } = renderBar()
    await settle()

    await scrollTo(scroller, NAV_COLLAPSE_THRESHOLD)
    expect(bar).toHaveAttribute('data-collapsed', 'false')
    await scrollTo(scroller, NAV_COLLAPSE_THRESHOLD + 1)
    expect(bar).toHaveAttribute('data-collapsed', 'true')
    await scrollTo(scroller, 0)
    expect(bar).toHaveAttribute('data-collapsed', 'false')
  })

  // Stands in for a Next.js parallel-route slot, which the orchestrator can't see through.
  const Slot = ({ children }: { children: ReactNode }) => <>{children}</>

  const list = (
    <Pane key='list' column='list'>
      {tall}
    </Pane>
  )
  const inspector = (
    <Pane key='inspector' column='inspector'>
      {tall}
    </Pane>
  )

  it.each([
    [
      'a pane the stack has covered',
      'false',
      0,
      [list, <Pane key='detail'>{tall}</Pane>]
    ],
    [
      'a top pane that keeps the bar visible',
      'false',
      1,
      [
        list,
        <Pane key='detail' tabBar='visible'>
          {tall}
        </Pane>
      ]
    ],
    ['an inspector', 'false', 0, [inspector, list]],
    ['a list beside an inspector', 'true', 1, [inspector, list]],
    [
      'a top pane inside a wrapper',
      'true',
      1,
      [
        <Slot key='list'>{list}</Slot>,
        <Slot key='detail'>
          <Pane>{tall}</Pane>
        </Slot>
      ]
    ]
  ])(
    'scrolling %s leaves the bar collapsed: %s',
    async (_, collapsed, scrolled, panes) => {
      await page.viewport(1400, 844)
      onTestFinished(() => page.viewport(390, 844))
      const { bar } = renderBar({ panes })
      await settle()
      const viewport = document.querySelectorAll<HTMLElement>(
        '[data-slot="pane-viewport"]'
      )[scrolled]!

      await scrollTo(viewport, 400)

      expect(viewport.scrollTop).toBe(400)
      expect(bar).toHaveAttribute('data-collapsed', collapsed)
    }
  )
})

const label = (tab: Element) =>
  tab.querySelector('[data-slot="navigator-tab-label"]')?.textContent

const transitioned = (element: Element) => {
  const style = getComputedStyle(element)
  const durations = style.transitionDuration.split(',').map(parseFloat)
  return style.transitionProperty
    .split(',')
    .map((property) => property.trim())
    .filter((_, index) => (durations[index % durations.length] ?? 0) > 0)
}

describe('the collapsed bar', () => {
  const six = ['a', 'b', 'c', 'd', 'e', 'f']

  it.each([
    [
      'the active tab and More',
      { tabs: six, pinned: false, value: 'a' },
      'A',
      'More'
    ],
    [
      'the first tab and More, when a folded item is active',
      { tabs: six, pinned: false, value: 'e' },
      'A',
      'More'
    ],
    ['the active tab beside the pinned circle', { value: 'a' }, 'A', null],
    [
      'the first tab, when the pinned item is active',
      { value: 'account' },
      'A',
      null
    ],
    [
      'More, when a folded item is active beside the pinned circle',
      { tabs: six, value: 'e' },
      'More',
      null
    ]
  ])('floats %s as 3.5rem circles', async (_, options, start, end) => {
    const { bar, scroller } = renderBar(options)
    await settle()
    await collapse(scroller)
    const circle = (side: string) =>
      bar.querySelector<HTMLElement>(`[data-circle-side="${side}"]`)

    expect(circle('start')).toHaveAccessibleName(start)
    expect(circle('start')!.getBoundingClientRect().width).toBeCloseTo(56, 0)
    if (end === null) {
      expect(circle('end')).toBeNull()
    } else {
      expect(circle('end')).toHaveAccessibleName(end)
      expect(circle('end')!.getBoundingClientRect().height).toBeCloseTo(56, 0)
    }
    for (const tab of bar.querySelectorAll('[data-slot="navigator-item"]')) {
      expect(getComputedStyle(tab).order).toBe('0')
    }
  })

  it('scales the other tabs away, keeping them in the accessibility tree but out of the tab order until it expands', async () => {
    const { bar, scroller } = renderBar({ value: 'a', menu: 'b' })
    await settle()
    const tabs = () => within(bar).getAllByRole('button')
    const tabbable = () =>
      tabs()
        .filter((tab) => tab.tabIndex >= 0)
        .map(label)
    expect(tabbable()).toEqual(['A', 'B', 'C', 'Account'])

    await collapse(scroller)

    expect(tabs()).toHaveLength(4)
    expect(tabbable()).toEqual(['A', 'Account'])
    for (const name of ['B', 'C']) {
      const tab = within(bar).getByRole('button', { name })
      expect(tab.getBoundingClientRect().width).toBe(0)
      expect(getComputedStyle(tab).opacity).toBe('0')
    }

    await scrollTo(scroller, 0)
    expect(tabbable()).toEqual(['A', 'B', 'C', 'Account'])
  })

  it('fades the pill out without moving the bar or changing the track height', async () => {
    const { bar, part, scroller } = renderBar()
    await settle()
    const pill = bar.querySelector('[data-slot="navigator-primary-pill"]')!
    const before = bar.getBoundingClientRect()
    const track = part('navigator-primary-track').height
    expect(getComputedStyle(pill).opacity).toBe('1')

    await collapse(scroller)

    expect(getComputedStyle(pill).opacity).toBe('0')
    expect(bar.getBoundingClientRect().toJSON()).toEqual(before.toJSON())
    expect(part('navigator-primary-track').height).toBe(track)
  })

  it('drops each circle to the foot of the track', async () => {
    const { bar, part, scroller } = renderBar({ tabs: six, pinned: false })
    await settle()
    await collapse(scroller)
    const foot = part('navigator-primary-track').bottom

    for (const circle of bar.querySelectorAll('[data-circle-side]')) {
      expect(circle.getBoundingClientRect().bottom).toBeCloseTo(foot, 0)
    }
  })

  it('lets the page show through the pill and the circles, but not the tabs', async () => {
    const { bar, scroller } = renderBar({ value: 'a' })
    await settle()
    const blurred = (element: Element) =>
      getComputedStyle(element).backdropFilter !== 'none'
    const button = (name: string) => within(bar).getByRole('button', { name })
    expect(
      blurred(bar.querySelector('[data-slot="navigator-primary-pill"]')!)
    ).toBe(true)
    expect(blurred(button('Account'))).toBe(true)
    expect(blurred(button('B'))).toBe(false)

    await collapse(scroller)

    expect(blurred(button('A'))).toBe(true)
  })

  it('gives the collapsed active circle the accent icon on a translucent surface, not an accent pill', async () => {
    const { bar, scroller } = renderBar({ value: 'a' })
    await settle()
    await collapse(scroller)
    const active = getComputedStyle(
      within(bar).getByRole('button', { name: 'A' })
    )
    const idle = getComputedStyle(
      within(bar).getByRole('button', { name: 'Account' })
    )

    expect(alpha(active.backgroundColor)).toBeCloseTo(0.85, 2)
    expect(active.color).not.toBe(idle.color)
  })

  it.each([false, true])(
    'lets input through to the page between its circles, with a pinned item: %s',
    async (withPinned) => {
      const { bar, scroller } = renderBar({ tabs: six, pinned: withPinned })
      await settle()
      await collapse(scroller)
      const hit = (box: DOMRect) =>
        document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
      const circles = [
        ...bar.querySelectorAll('[data-circle-side]'),
        ...bar.querySelectorAll('[data-slot="navigator-primary-circle"] button')
      ]

      expect(circles).toHaveLength(2)
      for (const circle of circles) {
        expect(circle.contains(hit(circle.getBoundingClientRect()))).toBe(true)
      }
      expect(bar.contains(hit(bar.getBoundingClientRect()))).toBe(false)
    }
  )

  it('never transitions a layout property on the bar or its tabs', async () => {
    const { bar, scroller } = renderBar()
    await settle()
    await collapse(scroller)
    const properties = [
      bar,
      ...bar.querySelectorAll('[data-slot="navigator-item"]')
    ].flatMap(transitioned)

    expect(properties.length).toBeGreaterThan(0)
    for (const property of properties) {
      expect(property).not.toMatch(
        /^(padding|margin|(min-|max-)?(width|height)|left|right|top|bottom|inset)/
      )
    }
  })
})

describe('a tap on the collapsed bar', () => {
  it.each([
    ['active tab', 'a', 'A'],
    ['active pinned circle', 'account', 'Account']
  ])(
    'on the %s reopens the bar, without scrolling or navigating',
    async (_, value, name) => {
      const onValueChange = vi.fn()
      const { bar, scroller } = renderBar({ value, onValueChange })
      await settle()
      await collapse(scroller)

      await userEvent.click(within(bar).getByRole('button', { name }))
      await settle()

      expect(bar).toHaveAttribute('data-collapsed', 'false')
      expect(scroller.scrollTop).toBe(400)
      expect(onValueChange).not.toHaveBeenCalled()
    }
  )

  it('keeps the bar open until the pane scrolls down again', async () => {
    const { bar, scroller } = renderBar({ value: 'a' })
    await settle()
    await collapse(scroller)
    await userEvent.click(within(bar).getByRole('button', { name: 'A' }))
    await settle()

    await scrollTo(scroller, 400)
    expect(bar).toHaveAttribute('data-collapsed', 'false')
    await scrollTo(scroller, 600)
    expect(bar).toHaveAttribute('data-collapsed', 'true')
  })

  it('on another tab navigates to it', async () => {
    const onValueChange = vi.fn()
    const { bar, scroller } = renderBar({ value: 'a', onValueChange })
    await settle()
    await collapse(scroller)

    await userEvent.click(within(bar).getByRole('button', { name: 'Account' }))

    expect(onValueChange).toHaveBeenCalledWith('account')
  })
})

describe('a tap on a collapsed tab with a route of its own', () => {
  const pages = Array.from({ length: 40 }, (_, index) => `/components/${index}`)

  function Docs({
    value,
    onValueChange
  }: {
    value: string
    onValueChange: (value: string) => void
  }) {
    return withStubLink(
      <div style={{ height: 844, display: 'grid' }}>
        <Navigator value={value} onValueChange={onValueChange}>
          <Navigator.Primary aria-label='Docs'>
            <Navigator.Item value='/' href='/'>
              Home
              <Navigator.Secondary aria-label='Home pages' overview>
                <Navigator.Item
                  value='/overview/philosophy'
                  href='/overview/philosophy'
                >
                  Philosophy
                </Navigator.Item>
              </Navigator.Secondary>
            </Navigator.Item>
            <Navigator.Item value='/components' href='/components'>
              Components
              <Navigator.Secondary aria-label='Components'>
                {pages.map((page) => (
                  <Navigator.Item key={page} value={page} href={page}>
                    {page}
                  </Navigator.Item>
                ))}
              </Navigator.Secondary>
            </Navigator.Item>
          </Navigator.Primary>
          <Pane>
            <Pane.Header />
            {tall}
          </Pane>
        </Navigator>
      </div>
    )
  }

  it.each([
    ['its overview', '/', 'Home', true],
    ['its list', '/components', 'Components', true],
    ['a sub-page', '/overview/philosophy', 'Home', false]
  ])(
    'on %s reopens the bar, scrolling the page to the top: %s',
    async (_, value, name, scrolls) => {
      const onValueChange = vi.fn()
      render(<Docs value={value} onValueChange={onValueChange} />)
      await settle()
      const bar = document.querySelector<HTMLElement>(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )!
      const scroller = document.querySelector<HTMLElement>(
        '[data-stack-position="top"] [data-slot="pane-viewport"]'
      )!
      await collapse(scroller)
      expect(bar).toHaveAttribute('data-collapsed', 'true')
      // A spy, not scrollTop: a rerun restores the remembered scroll and cancels it (INNO-1244).
      const scrollToTop = vi.spyOn(scroller, 'scrollTo')

      await userEvent.click(within(bar).getByRole('link', { name }))
      await settle()

      if (scrolls) {
        expect(scrollToTop).toHaveBeenCalledWith(
          expect.objectContaining({ top: 0 })
        )
      } else {
        expect(scrollToTop).not.toHaveBeenCalled()
      }
      expect(bar).toHaveAttribute('data-collapsed', 'false')
      expect(onValueChange).not.toHaveBeenCalled()
    }
  )
})
