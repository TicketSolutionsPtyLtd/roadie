import type { ReactNode } from 'react'

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

import roadieCss from '../../../vitest.browser.css?inline'
import { Dialog } from '../Dialog'
import { Drawer } from '../Drawer'
import { useStylesheet } from '../Pane/testUtils'
import { MapEngineContext } from './MapEngineContext'
import type { MapEngine, MapEngineInstance, MapPalette } from './engine'
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
  const ready = (frame: HTMLElement) =>
    waitFor(() => expect(frame).toHaveAttribute('data-status', 'ready'), {
      timeout: 10_000
    })
  const layer = () => screen.getByRole('dialog', { name: 'Map' })
  const hitAt = (x: number, y: number) => document.elementFromPoint(x, y)!
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
})
