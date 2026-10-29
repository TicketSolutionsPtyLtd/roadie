import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Hero } from '.'
import {
  DESKTOP,
  PHONE,
  atWidth,
  axeViolations,
  photo,
  widths,
  withBrowserPage
} from '../_test/browser'
import { pageHeader, pageHero } from './fixtures'

withBrowserPage()

const panel = (slot: string) =>
  document.querySelector<HTMLElement>(`[data-slot=hero-${slot}]`)!

const box = (slot: string) => panel(slot).getBoundingClientRect()
const shown = (slot: string) => getComputedStyle(panel(slot)).display !== 'none'

async function showAt(width: number, ui = <Hero {...pageHero(photo)} />) {
  await atWidth(width, 900)
  return render(ui)
}

describe('Hero page-hero layout', () => {
  it('stacks the title over the video on a phone, with no photo panels', async () => {
    await showAt(PHONE.width)

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
    await showAt(DESKTOP.width)

    expect(box('people').top).toBeCloseTo(box('heading').top, 0)
    expect(box('people').left).toBeGreaterThan(box('heading').right)
    expect(box('people').bottom).toBeCloseTo(box('heading').bottom, 0)
    expect(box('heading').width / box('people').width).toBeCloseTo(2, 0)
    expect(box('events').top).toBeCloseTo(box('video').top, 0)
    expect(box('events').left).toBeCloseTo(box('heading').left, 0)
    expect(box('video').right).toBeCloseTo(box('people').right, 0)
  })

  it('crops sized photos to fill each panel, whatever their own shape', async () => {
    await showAt(DESKTOP.width)

    for (const slot of ['heading', 'people', 'events', 'video']) {
      const frame = box(slot)
      const image = panel(slot).querySelector('img')!.getBoundingClientRect()
      expect(image.width, slot).toBeCloseTo(frame.width, 0)
      expect(image.height, slot).toBeCloseTo(frame.height, 0)
    }
    expect(box('video').width / box('video').height).toBeCloseTo(16 / 9, 1)
  })

  it('keeps its title the same light colour in both themes, over the photo', async () => {
    await showAt(DESKTOP.width)
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

    const title = document.querySelector('h1')!
    expect(title.getBoundingClientRect().width).toBeLessThanOrEqual(1024)
    expect(getComputedStyle(title).textAlign).toBe('start')
  })
})

describe.each([
  ['page-hero', pageHero(photo)],
  ['page-header', pageHeader]
])('Hero %s accessibility', (_, props) => {
  it.each(widths)(
    'has no axe violations on a $name',
    async ({ width, height }) => {
      await atWidth(width, height)
      const { container } = render(<Hero {...props} />)

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
