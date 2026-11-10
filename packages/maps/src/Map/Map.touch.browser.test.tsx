import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
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
})
