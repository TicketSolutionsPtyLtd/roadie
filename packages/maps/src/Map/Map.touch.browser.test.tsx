import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'
import { commands, server } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../testUtils'
import { MapEngineContext } from './MapEngineContext'
import type { MapEngine, MapEngineInstance } from './engine'
import blankStyle from './fixtures/blank-style.json?url'
import { Map } from './index'
import { maplibreEngine } from './maplibreEngine'

const venue = { lat: -27.4575, lng: 153.0355 }

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

// The swipe command drives touch over Chromium's DevTools protocol.
const swipes = server.browser === 'chromium'

async function renderMap(expanded: boolean) {
  const base = maplibreEngine({
    tiles: { light: blankStyle, attribution: [] }
  })
  let instance: MapEngineInstance | undefined
  const engine: MapEngine = {
    attribution: [],
    mount: async (...args) => (instance = await base.mount(...args))
  }
  render(
    <div style={{ width: 480 }}>
      <MapEngineContext value={engine}>
        <Map defaultCenter={venue} expanded={expanded} />
      </MapEngineContext>
    </div>
  )
  // Filling the window, the map hides the page, its frame too.
  const frame = screen.getByRole('region', { name: 'Map', hidden: true })
  await waitFor(() => expect(frame).toHaveAttribute('data-status', 'ready'), {
    timeout: 10_000
  })
  const canvas = document.querySelector<HTMLCanvasElement>(
    '[data-slot=map-surface] canvas'
  )!
  // The canvas fills the window once the map has redrawn to fit.
  if (expanded)
    await waitFor(() => expect(canvas.clientHeight).toBe(innerHeight))
  return { canvas, instance: instance! }
}

// A map with `defaultFit` and nothing on it yet, on a page long enough to
// scroll. `addPin` puts a pin on it a continent away, which the map jumps
// to, for reduced motion, unless the reader has used it.
const far = { lat: -31.95, lng: 115.86 }
async function renderWaiting() {
  await commands.reduceMotion(true)
  onTestFinished(() => commands.reduceMotion(false))
  // A test before this one may have left the page scrolled.
  scrollTo(0, 0)
  const base = maplibreEngine({
    tiles: { light: blankStyle, attribution: [] }
  })
  let instance: MapEngineInstance | undefined
  const engine: MapEngine = {
    attribution: [],
    mount: async (...args) => (instance = await base.mount(...args))
  }
  const page = (pinned: boolean) => (
    <div style={{ width: 480, height: 3000 }}>
      <MapEngineContext value={engine}>
        <Map defaultCenter={venue} defaultFit>
          {pinned && <Map.Marker position={far} label='Tin Whistle Wharf' />}
        </Map>
      </MapEngineContext>
    </div>
  )
  const view = render(page(false))
  const frame = screen.getByRole('region', { name: 'Map' })
  await waitFor(() => expect(frame).toHaveAttribute('data-status', 'ready'), {
    timeout: 10_000
  })
  const box = frame.getBoundingClientRect()
  return {
    instance: instance!,
    middle: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
    addPin: () => view.rerender(page(true))
  }
}

// A one-finger drag across the middle of the canvas.
async function drag(canvas: HTMLElement) {
  const box = canvas.getBoundingClientRect()
  const y = box.top + box.height / 2
  await commands.swipe(
    { x: box.left + box.width / 2 + 60, y },
    { x: box.left + box.width / 2 - 60, y }
  )
}

describe('Map on a touch screen', () => {
  it.runIf(swipes)(
    'pans with one finger while it fills the window',
    { timeout: 15_000 },
    async () => {
      const { canvas, instance } = await renderMap(true)
      const before = instance.getView().center.lng
      await drag(canvas)

      await waitFor(() =>
        expect(instance.getView().center.lng).toBeGreaterThan(before)
      )
    }
  )

  it.runIf(swipes)(
    'leaves one finger to the page inline, and says how to pan',
    { timeout: 15_000 },
    async () => {
      const { canvas, instance } = await renderMap(false)
      const hint = canvas.parentElement!.querySelector(
        '.maplibregl-cooperative-gesture-screen'
      )!
      const flagged = new Promise<void>((resolve) => {
        const watcher = new MutationObserver(() => {
          if (!hint.classList.contains('maplibregl-show')) return
          watcher.disconnect()
          resolve()
        })
        watcher.observe(hint, { attributes: true, attributeFilter: ['class'] })
      })
      const before = instance.getView().center
      await drag(canvas)
      await flagged

      expect(instance.getView().center).toEqual(before)
    }
  )

  it.runIf(swipes)(
    'still opens on a pin that comes late after one finger scrolls the page across it',
    { timeout: 15_000 },
    async () => {
      const { instance, middle, addPin } = await renderWaiting()
      await commands.swipe(
        { x: middle.x, y: middle.y + 60 },
        { x: middle.x, y: middle.y - 60 }
      )
      await waitFor(() => expect(scrollY).toBeGreaterThan(0))
      expect(instance.getView().center.lng).toBeCloseTo(venue.lng, 3)

      addPin()
      expect(instance.getView().center.lng).toBeCloseTo(far.lng, 3)
    }
  )

  it(
    'stays where it is for a pin that comes late after a tap on it',
    { timeout: 15_000 },
    async () => {
      const { instance, middle, addPin } = await renderWaiting()
      await commands.tap(middle.x, middle.y)
      const before = instance.getView()

      addPin()
      expect(instance.getView()).toEqual(before)
    }
  )
})
