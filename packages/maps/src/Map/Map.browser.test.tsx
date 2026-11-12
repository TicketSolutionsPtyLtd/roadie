import { type ReactNode, useState } from 'react'

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { Button } from '@oztix/roadie-components/button'
import { Dialog } from '@oztix/roadie-components/dialog'
import { Drawer } from '@oztix/roadie-components/drawer'
import { Field } from '@oztix/roadie-components/field'
import { Popover } from '@oztix/roadie-components/popover'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../testUtils'
import { MapEngineContext } from './MapEngineContext'
import type {
  MapAreaGeometry,
  MapEngine,
  MapEngineInstance,
  MapPalette
} from './engine'
import blankStyle from './fixtures/blank-style.json?url'
import { Map } from './index'
import { maplibreEngine } from './maplibreEngine'

const engine = maplibreEngine({
  tiles: { light: blankStyle, attribution: [{ label: 'Fixture' }] }
})
const venue = { lat: -27.4575, lng: 153.0355 }

let removeStylesheet: () => void
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

async function renderReadyMap(ui = <Map defaultCenter={venue} />, width = 480) {
  render(
    <div style={{ width }}>
      <button type='button'>Before</button>
      <MapEngineContext value={engine}>{ui}</MapEngineContext>
    </div>
  )
  const frame = screen.getByRole('region', { name: 'Map' })
  await waitFor(() => expect(frame).toHaveAttribute('data-status', 'ready'), {
    timeout: 10_000
  })
  return frame
}

const inside = (inner: DOMRect, outer: DOMRect) =>
  inner.top >= outer.top - 0.5 &&
  inner.left >= outer.left - 0.5 &&
  inner.bottom <= outer.bottom + 0.5 &&
  inner.right <= outer.right + 0.5

describe('Map in the browser', () => {
  it('draws its canvas over the whole frame', { timeout: 15_000 }, async () => {
    const frame = await renderReadyMap()
    const canvas = frame.querySelector('canvas')!

    const outer = frame.getBoundingClientRect()
    const drawn = canvas.getBoundingClientRect()
    expect(drawn.top).toBeCloseTo(outer.top, 0)
    expect(drawn.left).toBeCloseTo(outer.left, 0)
    expect(drawn.width).toBeCloseTo(outer.width, 0)
    expect(drawn.height).toBeCloseTo(outer.height, 0)
  })

  it(
    'shows how to zoom over the map when the page scrolls across it',
    { timeout: 15_000 },
    async () => {
      const frame = await renderReadyMap()
      const hint = frame.querySelector<HTMLElement>(
        '.maplibregl-cooperative-gesture-screen'
      )!
      expect(getComputedStyle(hint).opacity).toBe('0')
      expect(hint).toHaveClass('emphasis-overlay')
      expect(getComputedStyle(hint).backgroundColor).not.toBe(
        'rgba(0, 0, 0, 0)'
      )

      // MapLibre flags the hint for 100ms when a scroll is blocked. Wait for
      // it to set the flag and take it off, rather than racing its timer.
      const flagged = (on: boolean) =>
        new Promise<void>((resolve) => {
          const watcher = new MutationObserver(() => {
            if (hint.classList.contains('maplibregl-show') !== on) return
            watcher.disconnect()
            resolve()
          })
          watcher.observe(hint, {
            attributes: true,
            attributeFilter: ['class']
          })
        })
      const shown = flagged(true)
      const hidden = shown.then(() => flagged(false))
      frame.querySelector('canvas')!.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: 100,
          bubbles: true,
          cancelable: true
        })
      )
      await hidden

      // Held shown, Roadie's stylesheet fades it in over the map.
      hint.classList.add('maplibregl-show')
      await waitFor(() => expect(getComputedStyle(hint).opacity).toBe('1'))
      expect(
        inside(hint.getBoundingClientRect(), frame.getBoundingClientRect())
      ).toBe(true)
    }
  )

  it(
    'fills its container’s width when given a height',
    { timeout: 15_000 },
    async () => {
      const frame = await renderReadyMap(
        <Map defaultCenter={venue} style={{ height: 200 }} />
      )

      expect(frame.getBoundingClientRect().width).toBeCloseTo(480, 0)
      expect(frame.getBoundingClientRect().height).toBeCloseTo(200, 0)
    }
  )

  it(
    'leaves one-finger scrolling to the page and pinching to the map',
    { timeout: 15_000 },
    async () => {
      const frame = await renderReadyMap()
      const canvas = frame.querySelector('canvas')!

      expect(getComputedStyle(canvas).touchAction).toBe('pan-x pan-y')
      expect(getComputedStyle(canvas.parentElement!).touchAction).toBe(
        'pan-x pan-y'
      )
    }
  )

  it('shows its focus ring inside the frame', { timeout: 15_000 }, async () => {
    const frame = await renderReadyMap()
    screen.getByRole('button', { name: 'Before' }).focus()
    await userEvent.keyboard('{Tab}')
    const canvas = frame.querySelector('canvas')!
    expect(canvas).toHaveFocus()

    const ring = getComputedStyle(canvas)
    expect(ring.outlineStyle).toBe('solid')
    // The frame clips what's outside the canvas, so the ring must sit inside.
    expect(
      parseFloat(ring.outlineWidth) + parseFloat(ring.outlineOffset)
    ).toBeLessThanOrEqual(0)
    expect(parseFloat(ring.outlineWidth)).toBeGreaterThan(0)
  })

  describe('credits', () => {
    // Display none on a wide map, so found by place rather than by role.
    const creditsButton = (frame: HTMLElement) =>
      frame.querySelector<HTMLButtonElement>(
        '[data-slot=map-credits] button[aria-label="Map credits"]'
      )

    // Panning by keyboard moves the map, which collapses the credits.
    async function panMap(frame: HTMLElement) {
      frame.querySelector('canvas')!.focus()
      await userEvent.keyboard('{ArrowRight}')
      await waitFor(() =>
        expect(creditsButton(frame)).toHaveAttribute('aria-expanded', 'false')
      )
    }

    it(
      'fold behind an info button on a narrow map once it moves',
      { timeout: 15_000 },
      async () => {
        const frame = await renderReadyMap(<Map defaultCenter={venue} />, 320)
        const credits = screen.getByText('Fixture')
        expect(credits).toBeVisible()
        await panMap(frame)

        expect(credits).not.toBeVisible()
        expect(
          screen.getByRole('button', { name: 'Map credits' })
        ).toBeVisible()
      }
    )

    it('stay in full on a wide map', { timeout: 15_000 }, async () => {
      const frame = await renderReadyMap(<Map defaultCenter={venue} />, 640)
      await panMap(frame)

      expect(screen.getByText('Fixture')).toBeVisible()
      expect(creditsButton(frame)).not.toBeVisible()
    })
  })

  it("hangs each pin's point on its place", { timeout: 15_000 }, async () => {
    const frame = await renderReadyMap(
      <Map defaultCenter={venue}>
        <Map.Marker position={venue} label='Kazoo Hollow Room' />
      </Map>
    )
    const pin = await screen.findByRole('img', { name: 'Kazoo Hollow Room' })
    const shape = pin.querySelector('[data-slot=map-pin]')!
    const box = frame.getBoundingClientRect()
    // The centre of the map is the venue, so the point sits there.
    const point = { x: box.left + box.width / 2, y: box.top + box.height / 2 }
    const drawn = shape.getBoundingClientRect()

    expect(drawn.left + drawn.width / 2).toBeCloseTo(point.x, 0)
    expect(Math.abs(drawn.bottom - point.y)).toBeLessThanOrEqual(1.5)
  })

  it.each([
    ['marker', 'img'],
    ['picker', 'button']
  ] as const)(
    "sits a custom pin's bottom centre on its place, on a %s",
    { timeout: 15_000 },
    async (part, role) => {
      const graphic = (
        <svg viewBox='0 0 10 10' className='size-10'>
          <path d='M0 0h10L5 10z' />
        </svg>
      )
      const frame = await renderReadyMap(
        <Map defaultCenter={venue}>
          {part === 'marker' ? (
            <Map.Marker
              position={venue}
              label='Kazoo Hollow Room'
              pin={graphic}
            />
          ) : (
            <Map.Picker
              defaultValue={{ label: 'Kazoo Hollow Room', position: venue }}
              label='Kazoo Hollow Room'
              pin={graphic}
            />
          )}
        </Map>
      )
      const pin = await screen.findByRole(role, { name: 'Kazoo Hollow Room' })
      const box = frame.getBoundingClientRect()
      const point = { x: box.left + box.width / 2, y: box.top + box.height / 2 }
      const drawn = pin.querySelector('svg')!.getBoundingClientRect()

      expect(drawn.width).toBe(40)
      expect(drawn.left + drawn.width / 2).toBeCloseTo(point.x, 0)
      expect(Math.abs(drawn.bottom - point.y)).toBeLessThanOrEqual(0.5)
    }
  )

  it(
    'puts the toolbar in the top corner, inside the frame',
    { timeout: 15_000 },
    async () => {
      const frame = await renderReadyMap(
        <Map defaultCenter={venue}>
          <Map.Toolbar locate />
        </Map>
      )
      const toolbar = screen
        .getByRole('toolbar', { name: 'Zoom' })
        .closest('[data-slot=toolbar-surface]')!
      const outer = frame.getBoundingClientRect()
      const box = toolbar.getBoundingClientRect()

      expect(inside(box, outer)).toBe(true)
      expect(outer.right - box.right).toBeLessThan(16)
      expect(box.top - outer.top).toBeLessThan(16)
    }
  )

  it(
    'puts the search in the other top corner, clear of the toolbar on a phone',
    { timeout: 15_000 },
    async () => {
      const frame = await renderReadyMap(
        <Map defaultCenter={venue}>
          <Map.Toolbar />
          <Map.Search suggest={() => []} />
        </Map>,
        320
      )
      const search = frame
        .querySelector('[data-slot=map-viewport]')!
        .querySelector('[data-slot=autocomplete-input-group]')!
        .getBoundingClientRect()
      const toolbar = screen
        .getByRole('toolbar', { name: 'Zoom' })
        .closest('[data-slot=toolbar-surface]')!
        .getBoundingClientRect()
      const outer = frame.getBoundingClientRect()

      expect(inside(search, outer)).toBe(true)
      expect(search.left - outer.left).toBeLessThan(16)
      expect(search.top - outer.top).toBeLessThan(16)
      expect(search.right).toBeLessThanOrEqual(toolbar.left - 4)
      expect(search.width).toBeGreaterThan(200)
    }
  )

  it(
    'closes the search’s list on a press on the map, without moving the picker',
    { timeout: 15_000 },
    async () => {
      const kazoo = { label: 'Kazoo Hollow Room', position: venue }
      const moves: unknown[] = []
      const frame = await renderReadyMap(
        <Map defaultCenter={venue}>
          <Map.Search suggest={() => [kazoo]} />
          <Map.Picker
            defaultValue={{ label: 'Entrance', position: venue }}
            label='Entrance'
            onValueChange={(place) => moves.push(place)}
          />
        </Map>
      )
      await userEvent.type(
        screen.getByRole('combobox', { name: 'Search the map' }),
        'Kaz'
      )
      await screen.findByRole('option', { name: 'Kazoo Hollow Room' })
      const canvas = frame.querySelector('canvas')!

      await userEvent.click(canvas, { position: { x: 240, y: 220 } })
      await waitFor(() =>
        expect(screen.queryByRole('option')).not.toBeInTheDocument()
      )
      expect(moves).toEqual([])

      // The next press is a click on the map, which drops the pin.
      await userEvent.click(canvas, { position: { x: 240, y: 220 } })
      await waitFor(() => expect(moves).toHaveLength(1))
    }
  )

  it('pulses around my location', { timeout: 15_000 }, async () => {
    const geolocation = navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: (found: PositionCallback) => {
          found({
            coords: { latitude: venue.lat, longitude: venue.lng }
          } as GeolocationPosition)
          return 1
        },
        clearWatch: () => {}
      }
    })
    try {
      await renderReadyMap(
        <Map defaultCenter={venue}>
          <Map.Toolbar locate />
        </Map>
      )
      await userEvent.click(
        screen.getByRole('button', { name: 'Show my location' })
      )
      const dot = await screen.findByRole('img', { name: 'Your location' })
      const pulse = dot.parentElement!.querySelector(
        '[data-slot=map-user-location-pulse]'
      )!

      const [animation] = pulse.getAnimations()
      expect((animation as CSSAnimation).animationName).toBe(
        'map-location-pulse'
      )
      expect(animation!.effect!.getComputedTiming().iterations).toBe(Infinity)
      // The ring sits on the dot.
      const ring = pulse.getBoundingClientRect()
      const centre = dot.getBoundingClientRect()
      expect(
        Math.abs(ring.x + ring.width / 2 - (centre.x + centre.width / 2))
      ).toBeLessThan(1)
    } finally {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: geolocation
      })
    }
  })

  it(
    'stills the pulse when the reader asks for reduced motion',
    { timeout: 15_000 },
    async () => {
      const geolocation = navigator.geolocation
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          watchPosition: (found: PositionCallback) => {
            found({
              coords: { latitude: venue.lat, longitude: venue.lng }
            } as GeolocationPosition)
            return 1
          },
          clearWatch: () => {}
        }
      })
      await commands.reduceMotion(true)
      try {
        await renderReadyMap(
          <Map defaultCenter={venue}>
            <Map.Toolbar locate />
          </Map>
        )
        await userEvent.click(
          screen.getByRole('button', { name: 'Show my location' })
        )
        const dot = await screen.findByRole('img', { name: 'Your location' })
        const pulse = dot.parentElement!.querySelector(
          '[data-slot=map-user-location-pulse]'
        )!

        // The dot stays; the ring around it neither runs nor shows.
        await vi.waitFor(() => {
          const running = pulse
            .getAnimations()
            .filter((animation) => animation.playState === 'running')
          expect(running).toHaveLength(0)
        })
        expect(getComputedStyle(pulse).opacity).toBe('0')
        expect(dot.getBoundingClientRect().width).toBeGreaterThan(0)
      } finally {
        await commands.reduceMotion(false)
        Object.defineProperty(navigator, 'geolocation', {
          configurable: true,
          value: geolocation
        })
      }
    }
  )

  it(
    'shows, as well as says, when my location isn’t available',
    { timeout: 15_000 },
    async () => {
      const geolocation = navigator.geolocation
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: undefined
      })
      try {
        await renderReadyMap(
          <Map defaultCenter={venue}>
            <Map.Toolbar locate />
          </Map>
        )
        await userEvent.click(
          screen.getByRole('button', { name: 'Show my location' })
        )
        const status = await screen.findByText('Your location isn’t available')
        const box = status.getBoundingClientRect()
        expect(box.width).toBeGreaterThan(40)
        expect(box.height).toBeGreaterThan(10)
        // Below the button, not over it.
        const button = screen
          .getByRole('button', { name: 'Show my location' })
          .getBoundingClientRect()
        expect(box.top).toBeGreaterThanOrEqual(button.bottom)
      } finally {
        Object.defineProperty(navigator, 'geolocation', {
          configurable: true,
          value: geolocation
        })
      }
    }
  )

  it(
    'lines up the zoom buttons, my location and full screen',
    { timeout: 15_000 },
    async () => {
      await renderReadyMap(
        <Map defaultCenter={venue}>
          <Map.Toolbar locate expand />
        </Map>
      )
      const zoom = screen.getByRole('toolbar', { name: 'Zoom' })
      const locate = screen
        .getByRole('button', { name: 'Show my location' })
        .closest('[data-slot=map-control]')!
      const expand = screen
        .getByRole('button', { name: 'Full screen' })
        .closest('[data-slot=map-control]')!
      const boxes = [
        zoom.closest('[data-slot=toolbar-surface]')!,
        locate,
        expand
      ].map((element) => element.getBoundingClientRect())
      // One column, the same width, with a gap between each.
      for (const box of boxes) {
        expect(box.width).toBeCloseTo(boxes[0]!.width, 0)
        expect(box.right).toBeCloseTo(boxes[0]!.right, 0)
      }
      expect(boxes[1]!.top).toBeGreaterThan(boxes[0]!.bottom + 4)
      expect(boxes[2]!.top).toBeGreaterThan(boxes[1]!.bottom + 4)
    }
  )

  describe('basemap colours', () => {
    // A fake engine records the palette Map hands it.
    function recordingEngine() {
      const palettes: MapPalette[] = []
      const engine: MapEngine = {
        attribution: [],
        mount: async (_container, init) => {
          palettes.push(init.palette)
          return {
            getView: () => ({ center: venue, zoom: 13 }),
            setView: () => {},
            fitBounds: () => {},
            project: () => ({ x: 0, y: 0 }),
            unproject: () => venue,
            on: (() => () => {}) as MapEngineInstance['on'],
            setPalette: (palette) => palettes.push(palette),
            setAreas: () => {},
            destroy: () => {}
          }
        }
      }
      return { engine, palettes }
    }

    it('are rgb colours from the intent around the map', async () => {
      const neutral = recordingEngine()
      render(
        <MapEngineContext value={neutral.engine}>
          <Map defaultCenter={venue} />
        </MapEngineContext>
      )
      const brand = recordingEngine()
      render(
        <MapEngineContext value={brand.engine}>
          <Map defaultCenter={venue} className='intent-brand' />
        </MapEngineContext>
      )
      await waitFor(() => {
        expect(neutral.palettes.length).toBeGreaterThan(0)
        expect(brand.palettes.length).toBeGreaterThan(0)
      })

      const [plain] = neutral.palettes
      const [tinted] = brand.palettes
      expect(plain!.land).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
      expect(tinted!.water).not.toBe(plain!.water)
    })

    // The red, green and blue in an rgb() colour.
    const channels = (color: string) =>
      color.match(/\d+/g)!.slice(0, 3).map(Number) as [number, number, number]

    it('draw green parks and blue water with tone natural, whatever the intent', async () => {
      const neutral = recordingEngine()
      render(
        <MapEngineContext value={neutral.engine}>
          <Map defaultCenter={venue} tone='natural' />
        </MapEngineContext>
      )
      const brand = recordingEngine()
      render(
        <MapEngineContext value={brand.engine}>
          <Map defaultCenter={venue} tone='natural' className='intent-brand' />
        </MapEngineContext>
      )
      await waitFor(() => {
        expect(neutral.palettes.length).toBeGreaterThan(0)
        expect(brand.palettes.length).toBeGreaterThan(0)
      })

      const [natural] = neutral.palettes
      const [park, water] = [channels(natural!.park), channels(natural!.water)]
      expect(park[1]).toBeGreaterThan(park[0])
      expect(park[1]).toBeGreaterThan(park[2])
      expect(water[2]).toBeGreaterThan(water[0])
      expect(brand.palettes[0]).toEqual(natural)
    })

    it('repaint when the tone changes', async () => {
      const { engine, palettes } = recordingEngine()
      const { rerender } = render(
        <MapEngineContext value={engine}>
          <Map defaultCenter={venue} />
        </MapEngineContext>
      )
      // The mount's palette, then the first paint once the map is ready.
      await waitFor(() => expect(palettes.length).toBeGreaterThan(1))
      const intent = palettes.at(-1)!
      rerender(
        <MapEngineContext value={engine}>
          <Map defaultCenter={venue} tone='natural' />
        </MapEngineContext>
      )

      await waitFor(() => expect(palettes.at(-1)!.park).not.toBe(intent.park))
    })

    it('follow dark mode', { timeout: 10_000 }, async () => {
      const { engine, palettes } = recordingEngine()
      render(
        <MapEngineContext value={engine}>
          <Map defaultCenter={venue} />
        </MapEngineContext>
      )
      await waitFor(() => expect(palettes.length).toBeGreaterThan(0))
      const light = palettes.at(-1)!

      document.documentElement.classList.add('dark')
      try {
        await waitFor(() => expect(palettes.at(-1)!.land).not.toBe(light.land))
      } finally {
        document.documentElement.classList.remove('dark')
      }
    })
  })
})

describe('Map full screen in the browser', () => {
  // Wraps the engine to hand the test the map it draws.
  function recordingEngine() {
    let made: MapEngineInstance | undefined
    const recording: MapEngine = {
      attribution: engine.attribution,
      mount: async (...args) => (made = await engine.mount(...args))
    }
    return { engine: recording, instance: () => made! }
  }

  const ready = (frame: HTMLElement) =>
    waitFor(() => expect(frame).toHaveAttribute('data-status', 'ready'), {
      timeout: 10_000
    })
  const layer = () => screen.getByRole('dialog', { name: 'Map' })
  const hitAt = (x: number, y: number) => document.elementFromPoint(x, y)!
  const middle = (element: Element) => {
    const box = element.getBoundingClientRect()
    return hitAt(box.left + box.width / 2, box.top + box.height / 2)
  }
  const pageLocked = () =>
    [document.documentElement, document.body].some((element) =>
      /hidden|clip/.test(getComputedStyle(element).overflowY)
    )

  it(
    'fills the window from inside a translated, content-visibility container',
    { timeout: 15_000 },
    async () => {
      render(
        <div style={{ position: 'relative', translate: '0%', zIndex: 2 }}>
          <div style={{ contentVisibility: 'auto', width: 480 }}>
            <MapEngineContext value={engine}>
              <Map defaultCenter={venue}>
                <Map.Toolbar expand />
              </Map>
            </MapEngineContext>
          </div>
        </div>
      )
      await ready(screen.getByRole('region', { name: 'Map' }))
      await userEvent.click(screen.getByRole('button', { name: 'Full screen' }))

      const box = layer().getBoundingClientRect()
      expect(box.left).toBe(0)
      expect(box.top).toBe(0)
      expect(box.width).toBe(innerWidth)
      expect(box.height).toBe(innerHeight)
      expect(layer()).toContainElement(
        hitAt(innerWidth / 2, innerHeight / 2) as HTMLElement
      )
    }
  )

  it(
    'shows over the drawer it sits in, and keeps focus',
    { timeout: 15_000 },
    async () => {
      render(
        <Drawer defaultOpen>
          <Drawer.Content>
            <Drawer.Title>Venues</Drawer.Title>
            <MapEngineContext value={engine}>
              <Map defaultCenter={venue}>
                <Map.Toolbar expand />
              </Map>
            </MapEngineContext>
          </Drawer.Content>
        </Drawer>
      )
      await ready(await screen.findByRole('region', { name: 'Map' }))
      await userEvent.click(screen.getByRole('button', { name: 'Full screen' }))

      // The drawer sits at the bottom, so the top of the window is the map's
      // only if the map fills the window over it.
      expect(layer().getBoundingClientRect().height).toBe(innerHeight)
      expect(layer()).toContainElement(hitAt(innerWidth / 2, 40) as HTMLElement)
      expect(layer()).toContainElement(
        hitAt(innerWidth / 2, innerHeight - 40) as HTMLElement
      )
      // Once the map hides the drawer from screen readers, the drawer's own
      // focus handling has seen focus leave it, and leaves it in the map.
      await waitFor(() =>
        expect(
          document
            .querySelector('[data-slot=drawer-popup]')!
            .closest('[aria-hidden=true]')
        ).not.toBeNull()
      )
      expect(
        screen.getByRole('button', { name: 'Exit full screen' })
      ).toHaveFocus()
    }
  )

  it(
    'redraws to fit, and keeps each pin on its place',
    { timeout: 15_000 },
    async () => {
      const east = { lat: venue.lat, lng: venue.lng + 0.004 }
      const recording = recordingEngine()
      render(
        <div style={{ width: 480 }}>
          <MapEngineContext value={recording.engine}>
            <Map defaultCenter={venue}>
              <Map.Toolbar expand />
              <Map.Marker position={east} label='Kazoo Hollow Room' />
            </Map>
          </MapEngineContext>
        </div>
      )
      const frame = screen.getByRole('region', { name: 'Map' })
      await ready(frame)
      const viewport = frame.querySelector<HTMLElement>(
        '[data-slot=map-viewport]'
      )!
      // The pin's point, against where the map says the place is.
      const pinOnPlace = async () => {
        const pin = (
          await screen.findByRole('img', { name: 'Kazoo Hollow Room' })
        ).querySelector('[data-slot=map-pin]')!
        await waitFor(() => {
          const origin = viewport.getBoundingClientRect()
          const place = recording.instance().project(east)
          const drawn = pin.getBoundingClientRect()
          expect(drawn.left + drawn.width / 2 - origin.left).toBeCloseTo(
            place.x,
            0
          )
          expect(Math.abs(drawn.bottom - origin.top - place.y)).toBeLessThan(
            1.5
          )
        })
      }
      await pinOnPlace()
      const { center } = recording.instance().getView()

      await userEvent.click(screen.getByRole('button', { name: 'Full screen' }))
      const canvas = viewport.querySelector('canvas')!
      await waitFor(() => {
        expect(canvas.clientWidth).toBe(innerWidth)
        expect(canvas.clientHeight).toBe(innerHeight)
      })
      expect(getComputedStyle(canvas).touchAction).toBe('none')
      const kept = recording.instance().getView().center
      expect(kept.lat).toBeCloseTo(center.lat, 6)
      expect(kept.lng).toBeCloseTo(center.lng, 6)
      await pinOnPlace()

      await userEvent.click(
        screen.getByRole('button', { name: 'Exit full screen' })
      )
      await waitFor(() => expect(canvas.clientWidth).toBe(480))
      expect(getComputedStyle(canvas).touchAction).toBe('pan-x pan-y')
      await pinOnPlace()
    }
  )

  it(
    'shows a preview, and a dialog from it, over the map',
    { timeout: 15_000 },
    async () => {
      function VenueMap() {
        const [open, setOpen] = useState(false)
        return (
          <>
            <MapEngineContext value={engine}>
              <Map defaultCenter={venue} defaultExpanded>
                <Map.Marker position={venue} label='Kazoo Hollow Room'>
                  <Popover.Title>Kazoo Hollow Room</Popover.Title>
                  <Button onClick={() => setOpen(true)}>Venue details</Button>
                </Map.Marker>
              </Map>
            </MapEngineContext>
            <Dialog open={open} onOpenChange={setOpen}>
              <Dialog.Content size='sm'>
                <Dialog.Title>Doors at 7pm</Dialog.Title>
                <Dialog.Close render={<Button>Close</Button>} />
              </Dialog.Content>
            </Dialog>
          </>
        )
      }
      render(<VenueMap />)
      await ready(screen.getByRole('region', { name: 'Map', hidden: true }))
      await waitFor(() => expect(pageLocked()).toBe(true))
      await userEvent.click(
        await screen.findByRole('button', { name: 'Kazoo Hollow Room' })
      )

      const details = await screen.findByRole('button', {
        name: 'Venue details'
      })
      expect(layer()).toContainElement(details)
      await waitFor(() => expect(middle(details)).toBe(details))
      await userEvent.click(details)

      const title = await screen.findByText('Doors at 7pm')
      await waitFor(() => expect(middle(title)).toBe(title))
      await userEvent.click(screen.getByRole('button', { name: 'Close' }))
      await waitFor(() =>
        expect(screen.queryByText('Doors at 7pm')).not.toBeInTheDocument()
      )
      // Base UI lets go of a lock on a timer it queues as the dialog closes,
      // so a timer queued now runs after it.
      await new Promise((resolve) => setTimeout(resolve))
      expect(pageLocked()).toBe(true)
    }
  )

  it.each([
    [
      'drawer',
      (map: ReactNode) => (
        <Drawer defaultOpen>
          <Drawer.Content>
            <Drawer.Title>Venues</Drawer.Title>
            {map}
          </Drawer.Content>
        </Drawer>
      )
    ],
    [
      'dialog',
      (map: ReactNode) => (
        <Dialog defaultOpen>
          <Dialog.Content>
            <Dialog.Title>Venues</Dialog.Title>
            {map}
          </Dialog.Content>
        </Dialog>
      )
    ]
  ])(
    'exits on Escape before the %s it sits in closes',
    { timeout: 15_000 },
    async (_name, overlay) => {
      render(
        overlay(
          <MapEngineContext value={engine}>
            <Map defaultCenter={venue}>
              <Map.Toolbar expand />
            </Map>
          </MapEngineContext>
        )
      )
      await ready(await screen.findByRole('region', { name: 'Map' }))
      await userEvent.click(screen.getByRole('button', { name: 'Full screen' }))
      await userEvent.keyboard('{Escape}')

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Full screen' })
        ).toHaveFocus()
      )
      expect(
        screen.queryByRole('dialog', { name: 'Map', hidden: true })
      ).not.toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Venues' })).toHaveAttribute(
        'data-open'
      )

      await userEvent.keyboard('{Escape}')
      await waitFor(() =>
        expect(screen.queryByText('Venues')).not.toBeInTheDocument()
      )
    }
  )

  it(
    'keeps Tab in the map after a dialog from a preview closes',
    { timeout: 15_000 },
    async () => {
      function VenueMap() {
        const [open, setOpen] = useState(false)
        return (
          <>
            <a href='#behind'>Behind</a>
            <MapEngineContext value={engine}>
              <Map defaultCenter={venue}>
                <Map.Toolbar expand />
                <Map.Marker position={venue} label='Kazoo Hollow Room'>
                  <Button onClick={() => setOpen(true)}>Venue details</Button>
                </Map.Marker>
              </Map>
            </MapEngineContext>
            <Dialog open={open} onOpenChange={setOpen}>
              <Dialog.Content size='sm'>
                <Dialog.Title>Doors at 7pm</Dialog.Title>
              </Dialog.Content>
            </Dialog>
          </>
        )
      }
      render(<VenueMap />)
      await ready(screen.getByRole('region', { name: 'Map' }))
      await userEvent.click(screen.getByRole('button', { name: 'Full screen' }))
      await userEvent.click(
        await screen.findByRole('button', { name: 'Kazoo Hollow Room' })
      )
      await userEvent.click(
        await screen.findByRole('button', { name: 'Venue details' })
      )
      await screen.findByText('Doors at 7pm')
      await userEvent.keyboard('{Escape}')
      await waitFor(() =>
        expect(screen.queryByText('Doors at 7pm')).not.toBeInTheDocument()
      )

      // Round the map's controls and back, past each end.
      for (const key of [
        ...Array(8).fill('{Tab}'),
        ...Array(8).fill('{Shift>}{Tab}{/Shift}')
      ]) {
        await userEvent.keyboard(key)
        // A focus guard at the map's edge hands focus back in.
        await waitFor(() =>
          expect(layer()).toContainElement(
            document.activeElement as HTMLElement
          )
        )
      }
    }
  )

  it(
    'leaves the page where it was, scrolled and laid out',
    { timeout: 15_000 },
    async () => {
      render(
        <div style={{ width: 480 }}>
          <div style={{ height: 1500 }} />
          <MapEngineContext value={engine}>
            <Map defaultCenter={venue}>
              <Map.Toolbar expand />
            </Map>
          </MapEngineContext>
          <div style={{ height: 1500 }} />
        </div>
      )
      const frame = screen.getByRole('region', { name: 'Map' })
      await ready(frame)
      frame.scrollIntoView({ block: 'center' })
      const scrolled = scrollY
      const before = frame.getBoundingClientRect()
      expect(scrolled).toBeGreaterThan(0)

      await userEvent.click(screen.getByRole('button', { name: 'Full screen' }))
      await waitFor(() => expect(pageLocked()).toBe(true))
      await userEvent.click(
        screen.getByRole('button', { name: 'Exit full screen' })
      )
      await waitFor(() => expect(pageLocked()).toBe(false))

      expect(scrollY).toBe(scrolled)
      expect(frame.getBoundingClientRect().toJSON()).toEqual(before.toJSON())
    }
  )

  it(
    'shows the search’s places over the map, and takes a click on one',
    { timeout: 15_000 },
    async () => {
      const kazoo = { label: 'Kazoo Hollow Room', position: venue }
      const chosen: unknown[] = []
      render(
        <MapEngineContext value={engine}>
          <Map defaultCenter={venue} defaultExpanded>
            <Map.Toolbar expand />
            <Map.Search
              suggest={() => [kazoo]}
              onPlaceSelect={(place) => chosen.push(place)}
            />
          </Map>
        </MapEngineContext>
      )
      await ready(screen.getByRole('region', { name: 'Map', hidden: true }))
      await userEvent.type(
        screen.getByRole('combobox', { name: 'Search the map' }),
        'Tiv'
      )

      const option = await screen.findByRole('option', {
        name: 'Kazoo Hollow Room'
      })
      expect(layer()).toContainElement(option)
      await waitFor(() => expect(option.contains(middle(option))).toBe(true))
      await userEvent.click(option)
      expect(chosen).toEqual([kazoo])
      expect(layer()).toBeInTheDocument()
    }
  )

  it(
    'exits on Escape from the search, once its list and text are gone',
    { timeout: 15_000 },
    async () => {
      const kazoo = { label: 'Kazoo Hollow Room', position: venue }
      render(
        <MapEngineContext value={engine}>
          <Map defaultCenter={venue}>
            <Map.Toolbar expand />
            <Map.Search suggest={() => [kazoo]} />
          </Map>
        </MapEngineContext>
      )
      await ready(screen.getByRole('region', { name: 'Map' }))
      await userEvent.click(screen.getByRole('button', { name: 'Full screen' }))
      const search = screen.getByRole('combobox', { name: 'Search the map' })
      await userEvent.type(search, 'Tiv')
      await screen.findByRole('option', { name: 'Kazoo Hollow Room' })

      // The list closes first, then the text clears, then the map exits.
      await userEvent.keyboard('{Escape}')
      await waitFor(() =>
        expect(screen.queryByRole('option')).not.toBeInTheDocument()
      )
      expect(layer()).toBeInTheDocument()
      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(search).toHaveValue(''))
      await userEvent.keyboard('{Escape}')
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: 'Map', hidden: true })
        ).not.toBeInTheDocument()
      )
    }
  )

  it(
    'exits on Escape from the search after a place is chosen',
    { timeout: 15_000 },
    async () => {
      const kazoo = { label: 'Kazoo Hollow Room', position: venue }
      render(
        <MapEngineContext value={engine}>
          <Map defaultCenter={venue}>
            <Map.Toolbar expand />
            <Map.Search suggest={() => [kazoo]} />
          </Map>
        </MapEngineContext>
      )
      await ready(screen.getByRole('region', { name: 'Map' }))
      await userEvent.click(screen.getByRole('button', { name: 'Full screen' }))
      const search = screen.getByRole('combobox', { name: 'Search the map' })
      await userEvent.type(search, 'Tiv')
      await userEvent.click(
        await screen.findByRole('option', { name: 'Kazoo Hollow Room' })
      )
      await waitFor(() => expect(search).toHaveValue('Kazoo Hollow Room'))
      expect(search).toHaveFocus()
      await waitFor(() =>
        expect(screen.queryByRole('option')).not.toBeInTheDocument()
      )

      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(search).toHaveValue(''))
      expect(layer()).toBeInTheDocument()
      await userEvent.keyboard('{Escape}')
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: 'Map', hidden: true })
        ).not.toBeInTheDocument()
      )
    }
  )
})

describe('Map keyboard-only buttons in the browser', () => {
  const valley: MapAreaGeometry = {
    type: 'Polygon',
    coordinates: [
      [
        [venue.lng - 0.01, venue.lat - 0.01],
        [venue.lng + 0.01, venue.lat - 0.01],
        [venue.lng + 0.01, venue.lat + 0.01],
        [venue.lng - 0.01, venue.lat - 0.01]
      ]
    ]
  }

  it(
    'shows the picker’s drop button only while it has keyboard focus, in the middle of the map',
    { timeout: 15_000 },
    async () => {
      await renderReadyMap(
        <Map defaultCenter={venue}>
          <Map.Area area={valley} label='The valley'>
            <p>The valley</p>
          </Map.Area>
          <Map.Picker />
        </Map>
      )
      const area = await screen.findByRole('button', { name: 'The valley' })
      const drop = screen.getByRole('button', { name: 'Drop the pin here' })
      expect(getComputedStyle(area).opacity).toBe('0')
      expect(getComputedStyle(drop).opacity).toBe('0')

      // WebKit's Tab skips plain buttons, as Safari does until the reader
      // turns on Tab to every control, so a key sets keyboard focus first.
      await userEvent.keyboard('{Shift}')
      drop.focus()
      expect(drop).toHaveFocus()
      await waitFor(() => expect(getComputedStyle(drop).opacity).toBe('1'))
      expect(getComputedStyle(area).opacity).toBe('0')
      // It sits in the middle of the map.
      const map = screen
        .getByRole('region', { name: 'Map' })
        .getBoundingClientRect()
      const box = drop.getBoundingClientRect()
      expect(
        Math.abs(box.x + box.width / 2 - (map.x + map.width / 2))
      ).toBeLessThan(2)
    }
  )

  it(
    'lets a press where a hidden button sits reach the map',
    { timeout: 15_000 },
    async () => {
      await renderReadyMap(
        <Map defaultCenter={venue}>
          <Map.Area area={valley} label='The valley'>
            <p>The valley</p>
          </Map.Area>
          <Map.Picker />
        </Map>
      )
      const area = await screen.findByRole('button', { name: 'The valley' })
      const drop = screen.getByRole('button', { name: 'Drop the pin here' })

      // A click there drops the pin where it lands, and a drag pans.
      for (const button of [area, drop]) {
        const box = button.getBoundingClientRect()
        const pressed = document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2
        )
        expect(pressed).not.toBe(button)
        expect(button.contains(pressed)).toBe(false)
      }
    }
  )

  it(
    'shows Drop the pin here when a required picker stops the form',
    { timeout: 15_000 },
    async () => {
      let submitted = false
      await renderReadyMap(
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submitted = true
          }}
        >
          <Field required>
            <Field.Label>Entrance</Field.Label>
            <Map defaultCenter={venue}>
              <Map.Picker name='entrance' />
            </Map>
          </Field>
          <Button type='submit'>Save</Button>
        </form>
      )

      await userEvent.click(screen.getByRole('button', { name: 'Save' }))
      const drop = screen.getByRole('button', { name: 'Drop the pin here' })
      await waitFor(() => expect(drop).toHaveFocus())
      expect(getComputedStyle(drop).opacity).toBe('1')
      expect(submitted).toBe(false)
    }
  )
})

describe('Map defaultFit in the browser', () => {
  // Four cities a continent apart, which no one zoom shows at every width.
  const cities = [
    { label: 'Tin Whistle Wharf', position: { lat: -31.95, lng: 115.86 } },
    { label: 'Mango Drum Yard', position: { lat: -12.46, lng: 130.84 } },
    { label: 'Apple Crate Hall', position: { lat: -42.88, lng: 147.33 } },
    { label: 'Kazoo Hollow Room', position: venue }
  ]
  const pinned = (fit: boolean) => (
    <Map defaultCenter={venue} defaultFit={fit}>
      {cities.map((city) => (
        <Map.Marker key={city.label} {...city} />
      ))}
    </Map>
  )
  const pinsInside = (frame: HTMLElement) => {
    const outer = frame.getBoundingClientRect()
    return cities.map(({ label }) => {
      const pin = screen.queryByRole('img', { name: label })
      return pin !== null && inside(pin.getBoundingClientRect(), outer)
    })
  }

  for (const width of [308, 714])
    it(
      `opens with every pin inside a ${width}px map`,
      { timeout: 15_000 },
      async () => {
        const frame = await renderReadyMap(pinned(true), width)

        await waitFor(() =>
          expect(pinsInside(frame)).toEqual([true, true, true, true])
        )
      }
    )

  it(
    'leaves pins out of view without it, so the test above can fail',
    { timeout: 15_000 },
    async () => {
      const frame = await renderReadyMap(pinned(false), 308)

      await screen.findByRole('img', { name: 'Kazoo Hollow Room' })
      expect(pinsInside(frame).filter(Boolean)).toHaveLength(1)
    }
  )

  it(
    'is on its pins from the first frame they show, and never moves after',
    { timeout: 15_000 },
    async () => {
      // Where the pin is at every frame and after every change to the page,
      // from before the map is ready, not only at the end. So a pin drawn
      // where the starting view puts it, or an ease into place, is seen.
      const lefts: number[] = []
      let sampling = true
      const read = () => {
        const pin = screen.queryByRole('img', { name: 'Tin Whistle Wharf' })
        if (pin) lefts.push(pin.getBoundingClientRect().left)
      }
      const eachFrame = () => {
        read()
        if (sampling) requestAnimationFrame(eachFrame)
      }
      requestAnimationFrame(eachFrame)
      const changes = new MutationObserver(read)
      changes.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true
      })
      try {
        const frame = await renderReadyMap(pinned(true), 714)
        await waitFor(() =>
          expect(pinsInside(frame)).toEqual([true, true, true, true])
        )
        // A dozen more frames, which an ease would still be moving in.
        const seen = lefts.length
        await waitFor(() => expect(lefts.length).toBeGreaterThan(seen + 12), {
          timeout: 5_000
        })
      } finally {
        sampling = false
        changes.disconnect()
      }

      expect(lefts.length).toBeGreaterThan(2)
      expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThan(1)
    }
  )
})
