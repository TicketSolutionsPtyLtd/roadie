// The contract every map engine keeps. Each engine runs this same file, so a
// new engine proves itself here before Map uses it. Tiles are local, so the
// suite never reaches the network.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LatLng, MapEngine, MapEngineInstance } from './engine'
import blankStyle from './fixtures/blank-style.json?url'
import { testPalette as palette } from './mapTestUtils'
import { maplibreEngine } from './maplibreEngine'

const ENGINES: [name: string, create: () => MapEngine][] = [
  [
    'maplibre',
    () =>
      maplibreEngine({
        tiles: { light: blankStyle, attribution: [{ label: 'Fixture' }] }
      })
  ]
]

const venue = { lat: -27.4575, lng: 153.0355 }

describe.each(ENGINES)('%s engine contract', (_name, create) => {
  let container: HTMLDivElement
  let instance: MapEngineInstance | undefined

  beforeEach(() => {
    container = document.createElement('div')
    container.style.cssText = 'position:relative;width:400px;height:300px'
    document.body.append(container)
  })

  afterEach(() => {
    instance?.destroy()
    instance = undefined
    container.remove()
  })

  const mount = async () => {
    instance = await create().mount(container, {
      center: venue,
      zoom: 14,
      label: 'Where Kazoo Hollow Room is',
      palette
    })
    return instance
  }

  it('starts at the view it was given', { timeout: 15_000 }, async () => {
    const { center, zoom } = (await mount()).getView()

    expect(center.lat).toBeCloseTo(venue.lat, 5)
    expect(center.lng).toBeCloseTo(venue.lng, 5)
    expect(zoom).toBeCloseTo(14, 5)
  })

  it('moves to a new view and says so', { timeout: 15_000 }, async () => {
    const map = await mount()
    let moves = 0
    const stop = map.on('move', () => moves++)
    map.setView({ center: { lat: -33.8688, lng: 151.2093 }, zoom: 10 })
    stop()

    const { center, zoom } = map.getView()
    expect(center.lat).toBeCloseTo(-33.8688, 5)
    expect(center.lng).toBeCloseTo(151.2093, 5)
    expect(zoom).toBeCloseTo(10, 5)
    expect(moves).toBeGreaterThan(0)
  })

  it(
    'puts the centre in the middle of the frame',
    { timeout: 15_000 },
    async () => {
      const { x, y } = (await mount()).project(venue)

      expect(x).toBeCloseTo(200, 0)
      expect(y).toBeCloseTo(150, 0)
    }
  )

  it(
    'turns a point back into the same place',
    { timeout: 15_000 },
    async () => {
      const map = await mount()
      const place = map.unproject(map.project({ lat: -27.46, lng: 153.03 }))

      expect(place.lat).toBeCloseTo(-27.46, 6)
      expect(place.lng).toBeCloseTo(153.03, 6)
    }
  )

  it(
    'names its focusable canvas with the label',
    { timeout: 15_000 },
    async () => {
      await mount()
      const focusable = container.querySelector<HTMLElement>('[tabindex="0"]')!

      expect(focusable.getAttribute('aria-label')).toBe(
        'Where Kazoo Hollow Room is'
      )
      expect(focusable.getAttribute('role')).not.toBe('region')
    }
  )

  it(
    'stops loading and leaves nothing behind when aborted',
    { timeout: 15_000 },
    async () => {
      const loading = new AbortController()
      const mounting = create().mount(
        container,
        {
          center: venue,
          zoom: 14,
          label: 'Where Kazoo Hollow Room is',
          palette
        },
        loading.signal
      )
      loading.abort(new Error('Unmounted'))

      await expect(mounting).rejects.toThrow('Unmounted')
      expect(container.querySelector('canvas')).toBeNull()
    }
  )

  it(
    'stops a map that has started loading when aborted',
    { timeout: 15_000 },
    async () => {
      const loading = new AbortController()
      // Abort as soon as the engine adds its canvas, before the style loads.
      const started = new MutationObserver(() => {
        started.disconnect()
        loading.abort(new Error('Unmounted'))
      })
      started.observe(container, { childList: true, subtree: true })
      const mounting = create().mount(
        container,
        {
          center: venue,
          zoom: 14,
          label: 'Where Kazoo Hollow Room is',
          palette
        },
        loading.signal
      )

      await expect(mounting).rejects.toThrow('Unmounted')
      expect(container.querySelector('canvas')).toBeNull()
    }
  )

  it(
    'follows its container’s size, keeping its centre in the middle',
    { timeout: 15_000 },
    async () => {
      const map = await mount()
      // An engine may take the container's first reported size as its
      // start, as MapLibre does, so the change comes a frame or two later.
      for (let frame = 0; frame < 2; frame++)
        await new Promise((resolve) => requestAnimationFrame(resolve))
      const moved = new Promise<void>((resolve) => {
        const stop = map.on('move', () => {
          stop()
          resolve()
        })
      })
      container.style.width = '600px'
      container.style.height = '400px'
      await moved

      const { x, y } = map.project(map.getView().center)
      expect(x).toBeCloseTo(300, 0)
      expect(y).toBeCloseTo(200, 0)
    }
  )

  it('eases to a new view when asked', { timeout: 15_000 }, async () => {
    const map = await mount()
    map.setView({ zoom: 16 }, { animate: true })

    // Partway through, the map hasn't arrived yet.
    expect(map.getView().zoom).toBeLessThan(16)
    await vi.waitFor(() => expect(map.getView().zoom).toBeCloseTo(16, 5), {
      timeout: 5_000
    })
  })

  it(
    'zooms on a plain scroll once gestures aren’t cooperative',
    { timeout: 15_000 },
    async (context) => {
      const map = await mount()
      // Optional: Map does without it for an engine that leaves it out.
      if (!map.setCooperativeGestures) context.skip()
      map.setCooperativeGestures!(false)
      const target = container.querySelector('canvas')!
      const box = target.getBoundingClientRect()
      target.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: -100,
          bubbles: true,
          cancelable: true,
          clientX: box.left + 200,
          clientY: box.top + 150
        })
      )

      await vi.waitFor(() => expect(map.getView().zoom).toBeGreaterThan(14))
    }
  )

  it('says where a click lands', { timeout: 15_000 }, async () => {
    const map = await mount()
    const clicked = new Promise<LatLng>((resolve) => {
      map.on('click', resolve)
    })
    const target = container.querySelector('canvas')!
    const box = target.getBoundingClientRect()
    const at = {
      clientX: box.left + 300,
      clientY: box.top + 100,
      bubbles: true
    }
    target.dispatchEvent(new MouseEvent('mousedown', at))
    target.dispatchEvent(new MouseEvent('mouseup', at))
    target.dispatchEvent(new MouseEvent('click', at))

    const place = await clicked
    const expected = map.unproject({ x: 300, y: 100 })
    expect(place.lat).toBeCloseTo(expected.lat, 6)
    expect(place.lng).toBeCloseTo(expected.lng, 6)
  })

  it('leaves nothing behind when destroyed', { timeout: 15_000 }, async () => {
    const map = await mount()
    expect(container.querySelector('canvas')).not.toBeNull()
    map.destroy()
    instance = undefined

    expect(container.querySelector('canvas')).toBeNull()
  })
})
