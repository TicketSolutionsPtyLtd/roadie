import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Pane } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
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
