import { type ReactElement, type ReactNode, act } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { page } from 'vitest/browser'

import { Pane } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Navigator } from '../Navigator'
import { Skeleton } from '../Skeleton'
import { COLLAPSE_AT, EXPAND_AT } from './PaneRoot'
import { forgetPaneScroll } from './paneScroll'
import { useStylesheet } from './testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})
afterEach(() => {
  cleanup()
  forgetPaneScroll()
})

// 1rem top padding, one 2.5rem control, and 0.5rem bottom padding.
const CONTROL_HEADER = 64

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

async function scrollTo(viewport: HTMLElement, top: number) {
  viewport.scrollTop = top
  viewport.dispatchEvent(new Event('scroll'))
  await settle()
}

function renderTitled({
  tabBar,
  hidden = false
}: { tabBar?: 'auto' | 'visible'; hidden?: boolean } = {}) {
  const { container } = render(
    <div style={{ width: 600, height: 500, display: hidden ? 'none' : 'grid' }}>
      <Pane tabBar={tabBar}>
        <Pane.Header>
          <Pane.Title>Corduroy Lagoon Sessions</Pane.Title>
        </Pane.Header>
        <div style={{ height: 2000 }} />
      </Pane>
    </div>
  )
  const header = container.querySelector<HTMLElement>(
    '[data-slot="pane-header"]'
  )!
  const viewport = container.querySelector<HTMLElement>(
    '[data-slot="pane-viewport"]'
  )!
  const title = container.querySelector<HTMLElement>(
    '[data-slot="pane-title"]'
  )!
  return { header, viewport, title }
}

const transitioned = (element: HTMLElement) => {
  const style = getComputedStyle(element)
  const durations = style.transitionDuration.split(',').map(parseFloat)
  return style.transitionProperty
    .split(',')
    .map((property) => property.trim())
    .filter((_, index) => (durations[index % durations.length] ?? 0) > 0)
}

describe('a pane header', () => {
  it('holds a title-only header at one control height once collapsed, without animating the floor', async () => {
    const { header, viewport } = renderTitled()
    await settle()
    expect(header.getBoundingClientRect().height).toBeGreaterThan(
      CONTROL_HEADER
    )

    viewport.scrollTop = 400
    viewport.dispatchEvent(new Event('scroll'))
    await settle()

    expect(header).toHaveAttribute('data-collapsed', 'true')
    expect(header.getBoundingClientRect().height).toBeCloseTo(CONTROL_HEADER, 0)
    expect(transitioned(header)).not.toContain('min-height')
    expect(transitioned(header)).not.toContain('all')
  })

  it.each([
    [1280, 12],
    [800, 0]
  ])(
    'at a %ipx viewport, draws a %ipx up affordance beside the compact title',
    async (width, size) => {
      await page.viewport(width, 900)
      const { viewport } = renderTitled()
      await scrollTo(viewport, 400)
      const icon = screen
        .getByRole('button', { name: 'Scroll to top' })
        .querySelector('svg')!

      expect(icon.getBoundingClientRect().width).toBe(size)
    }
  )
})

describe('a pane header on scroll', () => {
  it.each(['auto', 'visible'] as const)(
    'collapses past its threshold and expands only back under the lower one, with tabBar %s',
    async (tabBar) => {
      const { header, viewport } = renderTitled({ tabBar })
      // Anchoring would shift scrollTop by the folded title row, off the thresholds.
      viewport.style.overflowAnchor = 'none'
      await settle()
      expect(header).toHaveAttribute('data-collapsed', 'false')

      await scrollTo(viewport, COLLAPSE_AT + 1)
      expect(header).toHaveAttribute('data-collapsed', 'true')

      await scrollTo(viewport, (COLLAPSE_AT + EXPAND_AT) / 2)
      expect(header).toHaveAttribute('data-collapsed', 'true')

      await scrollTo(viewport, EXPAND_AT - 1)
      expect(header).toHaveAttribute('data-collapsed', 'false')
    }
  )

  it('stays expanded while an ancestor hides the pane', async () => {
    const { header } = renderTitled({ hidden: true })
    await settle()

    expect(header).toHaveAttribute('data-collapsed', 'false')
  })

  it('folds the title row and the gap above it away, and docks a shadow, without animating display or box-shadow', async () => {
    const { header, viewport, title } = renderTitled()
    await settle()
    const shadow = () => getComputedStyle(header, '::after').opacity
    expect(
      parseFloat(getComputedStyle(title).gridTemplateRows)
    ).toBeGreaterThan(0)
    expect(parseFloat(getComputedStyle(title).marginTop)).toBeGreaterThan(0)
    expect(shadow()).toBe('0')

    await scrollTo(viewport, 400)
    expect(getComputedStyle(title).gridTemplateRows).toBe('0px')
    expect(getComputedStyle(title).marginTop).toBe('0px')
    expect(getComputedStyle(title).display).not.toBe('none')
    expect(shadow()).toBe('1')
    expect(transitioned(title)).toEqual(
      expect.arrayContaining(['grid-template-rows', 'margin-top'])
    )
    expect(transitioned(title)).not.toContain('display')
    expect(transitioned(header)).not.toContain('box-shadow')
  })
})

describe('pane chrome', () => {
  function renderFramed() {
    const { container } = render(
      <div style={{ width: 600, height: 500, display: 'grid' }}>
        <Pane>
          <Pane.Header>
            <Pane.Title>Title</Pane.Title>
          </Pane.Header>
          <p>Body</p>
          <Pane.Footer>Footer</Pane.Footer>
        </Pane>
      </div>
    )
    const style = (slot: string) =>
      getComputedStyle(container.querySelector(`[data-slot="${slot}"]`)!)
    return {
      pane: [
        style('pane').borderTopLeftRadius,
        style('pane').borderBottomRightRadius
      ],
      header: style('pane-header').borderTopLeftRadius,
      footer: style('pane-footer').borderBottomRightRadius
    }
  }

  it.each([
    [1280, '16px'],
    [390, '0px']
  ])(
    'at a %ipx viewport, rounds the pane and its sticky chrome to %s',
    async (viewport, radius) => {
      await page.viewport(viewport, 900)
      const { pane, header, footer } = renderFramed()

      expect(pane).toEqual([radius, radius])
      expect(header).toBe(radius)
      expect(footer).toBe(radius)
    }
  )
})

describe('a pane header in a phone stack', () => {
  const stack = (reached: boolean, search = false) => (
    <div style={{ height: '100vh', display: 'grid' }}>
      <Navigator value='/shows'>
        <Pane column='list' aria-label='Shows'>
          <Pane.Header>
            <Pane.Title>Shows</Pane.Title>
          </Pane.Header>
        </Pane>
        <Pane reached={reached} aria-label='Show'>
          <Pane.Header onBack={() => {}}>
            <Pane.Title>The Rolling Kazoos</Pane.Title>
            {search ? <Pane.Search value='' onValueChange={() => {}} /> : null}
          </Pane.Header>
          <p data-row>Doors 7pm</p>
        </Pane>
      </Navigator>
    </div>
  )
  const heightOf = (element: Element) =>
    parseFloat(
      getComputedStyle(element).getPropertyValue('--pane-header-height')
    )
  // Where CSS can pick a value by another, the height follows Back in the
  // same frame; elsewhere the observer catches up a frame later.
  const sameFrame = CSS.supports('width', 'if(style(--x: 1): 1px; else: 2px)')

  it.each([
    ['a title', false],
    ['a title and a search', true]
  ])(
    'gives its content the height it lands at once pushed, with %s',
    async (_, search) => {
      await page.viewport(390, 844)
      const { rerender } = render(stack(false, search))
      await settle()
      const header = document.querySelector(
        '[data-slot="pane"][aria-label="Show"] [data-slot="pane-header"]'
      )!
      const row = document.querySelector('[data-row]')!
      const before = header.getBoundingClientRect().height
      expect(heightOf(row)).toBeCloseTo(before, 0)

      act(() => rerender(stack(true, search)))
      const after = header.getBoundingClientRect().height
      // Back takes a row of its own above the title.
      expect(after).toBeGreaterThan(before)
      if (sameFrame) expect(heightOf(row)).toBeCloseTo(after, 0)

      await settle()
      expect(heightOf(row)).toBeCloseTo(after, 0)
      // The sum held, so the observer wrote nothing over it.
      if (sameFrame)
        expect(
          header
            .closest<HTMLElement>('[data-slot="pane"]')!
            .style.getPropertyValue('--pane-header-measured')
        ).toBe('')
      act(() => rerender(stack(false, search)))
      await settle()
      expect(heightOf(row)).toBeCloseTo(before, 0)
    }
  )
})

describe('a pane header from the server', () => {
  // Server markup first, read, then hydrated and read again: nothing may move.
  async function serveThenHydrate(ui: ReactElement) {
    const host = document.createElement('div')
    host.innerHTML = renderToString(ui)
    document.body.append(host)
    const read = () => {
      const pane = host.querySelector<HTMLElement>('[data-slot="pane"]')!
      const first = host.querySelector<HTMLElement>('[data-probe]')!
      const header = host.querySelector<HTMLElement>(
        '[data-slot="pane-header"]'
      )
      return {
        top:
          first.getBoundingClientRect().top - pane.getBoundingClientRect().top,
        header: header?.getBoundingClientRect().height ?? 0
      }
    }
    await frames()
    const served = read()
    const onRecoverableError = vi.fn()
    const root = await act(async () =>
      hydrateRoot(host, ui, { onRecoverableError })
    )
    await frames()
    const hydrated = read()
    act(() => root.unmount())
    host.remove()
    return { served, hydrated, onRecoverableError }
  }

  const frame = (children: ReactNode) => (
    <div style={{ width: 600, height: 500, display: 'grid' }}>
      <Pane>{children}</Pane>
    </div>
  )

  it('holds an empty header above a body title at the height it hydrates to', async () => {
    const { served, hydrated, onRecoverableError } = await serveThenHydrate(
      frame(
        <>
          <Pane.Header />
          <Pane.BodyTitle data-probe>Midnight Frequency</Pane.BodyTitle>
          <div style={{ height: 2000 }} />
        </>
      )
    )

    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(served.header).toBeCloseTo(CONTROL_HEADER, 0)
    expect(hydrated).toEqual(served)
  })

  it('gives a skeleton pane with no title the same top', async () => {
    const { served, hydrated } = await serveThenHydrate(
      frame(
        <>
          <Pane.Header />
          <Skeleton data-probe shape='block' className='h-40' />
        </>
      )
    )

    expect(served.header).toBeCloseTo(CONTROL_HEADER, 0)
    expect(served.top).toBeCloseTo(CONTROL_HEADER, 0)
    expect(hydrated).toEqual(served)
  })

  it('holds a header of actions above a body title where it hydrates', async () => {
    const { served, hydrated } = await serveThenHydrate(
      frame(
        <>
          <Pane.Header>
            <Pane.Actions>
              <button type='button'>Share</button>
            </Pane.Actions>
          </Pane.Header>
          <Pane.BodyTitle data-probe>Midnight Frequency</Pane.BodyTitle>
        </>
      )
    )

    expect(hydrated).toEqual(served)
  })
})
