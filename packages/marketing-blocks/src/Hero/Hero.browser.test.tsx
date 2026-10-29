import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Hero } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { pageHeader, pageHero } from './testUtils'

let style: HTMLStyleElement

beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})

afterAll(async () => {
  style.remove()
  await page.viewport(1920, 1080)
})

const panel = (slot: string) =>
  document.querySelector<HTMLElement>(`[data-slot=hero-${slot}]`)!

const box = (slot: string) => panel(slot).getBoundingClientRect()
const shown = (slot: string) => getComputedStyle(panel(slot)).display !== 'none'

async function showAt(width: number, ui = <Hero {...pageHero} />) {
  cleanup()
  await page.viewport(width, 900)
  render(ui)
}

describe('Hero page-hero layout', () => {
  it('stacks the title over the video on a phone, with no photo panels', async () => {
    await showAt(390)

    expect(shown('people')).toBe(false)
    expect(shown('events')).toBe(false)
    expect(box('video').top).toBeGreaterThanOrEqual(box('heading').bottom)
    expect(box('video').width).toBeCloseTo(box('heading').width, 0)
  })

  it('sets the event photos beside the video under a full-width title on a tablet', async () => {
    await showAt(820)

    expect(shown('people')).toBe(false)
    expect(box('events').top).toBeCloseTo(box('video').top, 0)
    expect(box('events').right).toBeLessThan(box('video').left)
    expect(box('events').top).toBeGreaterThan(box('heading').bottom)
    expect(box('heading').width).toBeGreaterThan(
      box('video').right - box('events').left - 1
    )
  })

  it('puts the people photos beside the title, and events beside the video, on a desktop', async () => {
    await showAt(1280)

    expect(box('people').top).toBeCloseTo(box('heading').top, 0)
    expect(box('people').left).toBeGreaterThan(box('heading').right)
    expect(box('people').bottom).toBeCloseTo(box('heading').bottom, 0)
    expect(box('heading').width / box('people').width).toBeCloseTo(2, 0)
    expect(box('events').top).toBeCloseTo(box('video').top, 0)
    expect(box('events').left).toBeCloseTo(box('heading').left, 0)
    expect(box('video').right).toBeCloseTo(box('people').right, 0)
  })

  it('keeps its title the same light colour in both themes, over the photo', async () => {
    await showAt(1280)
    const title = document.querySelector('h1')!
    const light = getComputedStyle(title).color

    document.documentElement.classList.add('dark')
    const dark = getComputedStyle(title).color
    document.documentElement.classList.remove('dark')

    const probe = document.createElement('span')
    probe.style.color = 'var(--color-neutral-light-0)'
    document.body.append(probe)
    expect(light).toBe(getComputedStyle(probe).color)
    expect(dark).toBe(light)
    probe.remove()
  })
})

describe('Hero page-header layout', () => {
  it('starts its title at the page edge and holds it to a readable width', async () => {
    await showAt(1920, <Hero {...pageHeader} />)

    const title = document.querySelector('h1')!.getBoundingClientRect()
    expect(title.width).toBeLessThanOrEqual(1024)
    expect(getComputedStyle(document.querySelector('h1')!).textAlign).toBe(
      'start'
    )
  })
})

async function seriousViolations() {
  const { violations } = await axe.run(document, {
    resultTypes: ['violations'],
    // Roadie measures contrast with APCA instead (docs/decisions/0010-apca-contrast.md).
    rules: { 'color-contrast': { enabled: false } }
  })
  return violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .map(
      ({ id, nodes }) => `${id}: ${nodes.map(({ html }) => html).join(', ')}`
    )
}

describe.each([
  ['page-hero', pageHero],
  ['page-header', pageHeader]
])('Hero %s accessibility', (_, props) => {
  it.each([390, 1280])(
    'has no serious axe violations at %ipx',
    async (width) => {
      await showAt(width, <Hero {...props} />)

      expect(await seriousViolations()).toEqual([])
    }
  )
})
