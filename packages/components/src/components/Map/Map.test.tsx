import { act, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { MapEngineContext } from './MapEngineContext'
import type {
  LatLng,
  MapEngine,
  MapEngineInstance,
  MapMountOptions
} from './engine'
import { Map } from './index'

const venue = { lat: -27.4575, lng: 153.0355 }

function fakeEngine() {
  const moveListeners = new Set<() => void>()
  const instance: MapEngineInstance = {
    getView: vi.fn(() => ({ center: venue, zoom: 14 })),
    setView: vi.fn(),
    project: vi.fn(() => ({ x: 0, y: 0 })),
    unproject: vi.fn(() => venue),
    on: ((_event: 'move' | 'click', listener: (place?: LatLng) => void) => {
      moveListeners.add(listener)
      return () => moveListeners.delete(listener)
    }) as MapEngineInstance['on'],
    setPalette: vi.fn(),
    setAreas: vi.fn(),
    destroy: vi.fn()
  }
  let resolveMount: (value: MapEngineInstance) => void = () => {}
  let rejectMount: (reason: Error) => void = () => {}
  const mount = vi.fn(
    (_container: HTMLElement, _init: MapMountOptions, _signal?: AbortSignal) =>
      new Promise<MapEngineInstance>((resolve, reject) => {
        resolveMount = resolve
        rejectMount = reject
      })
  )
  const engine: MapEngine = {
    attribution: [
      { label: 'Tiles Co', href: 'https://tiles.example' },
      { label: 'Mapmakers' }
    ],
    mount
  }
  return {
    engine,
    instance,
    mount,
    loaded: () => act(async () => resolveMount(instance)),
    moved: () =>
      act(() => {
        for (const listener of moveListeners) listener()
      }),
    failed: () => act(async () => rejectMount(new Error('No WebGL')))
  }
}

function renderMap(engine: MapEngine, ui = <Map defaultCenter={venue} />) {
  return render(<MapEngineContext value={engine}>{ui}</MapEngineContext>)
}

describe('Map', () => {
  it('mounts the engine inside its frame at the default view', () => {
    const fake = fakeEngine()
    renderMap(fake.engine, <Map defaultCenter={venue} defaultZoom={15} />)

    expect(fake.mount).toHaveBeenCalledTimes(1)
    const [container, init] = fake.mount.mock.calls[0]!
    expect(screen.getByRole('region', { name: 'Map' })).toContainElement(
      container
    )
    expect(init).toMatchObject({ center: venue, zoom: 15, label: 'Map' })
  })

  it('starts at zoom 13 when no zoom is given', () => {
    const fake = fakeEngine()
    renderMap(fake.engine)

    expect(fake.mount.mock.calls[0]![1].zoom).toBe(13)
  })

  it('keeps its first view when the default props change', () => {
    const fake = fakeEngine()
    const { rerender } = renderMap(fake.engine)
    rerender(
      <MapEngineContext value={fake.engine}>
        <Map defaultCenter={{ lat: 0, lng: 0 }} defaultZoom={3} />
      </MapEngineContext>
    )

    expect(fake.mount).toHaveBeenCalledTimes(1)
  })

  it('names the region from aria-label', () => {
    const fake = fakeEngine()
    renderMap(
      fake.engine,
      <Map defaultCenter={venue} aria-label='Where Kazoo Hollow Room is' />
    )

    expect(
      screen.getByRole('region', { name: 'Where Kazoo Hollow Room is' })
    ).toBeInTheDocument()
    expect(fake.mount.mock.calls[0]![1].label).toBe(
      'Where Kazoo Hollow Room is'
    )
  })

  it('reports loading until the engine is ready', async () => {
    const fake = fakeEngine()
    renderMap(fake.engine)
    const region = screen.getByRole('region', { name: 'Map' })

    expect(region).toHaveAttribute('data-status', 'loading')
    expect(region).toHaveAttribute('aria-busy', 'true')
    await fake.loaded()
    expect(region).toHaveAttribute('data-status', 'ready')
    expect(region).not.toHaveAttribute('aria-busy')
  })

  it('destroys the engine on unmount', async () => {
    const fake = fakeEngine()
    const { unmount } = renderMap(fake.engine)
    await fake.loaded()
    unmount()

    expect(fake.instance.destroy).toHaveBeenCalledTimes(1)
  })

  it('cancels a mount still loading when it unmounts', () => {
    const fake = fakeEngine()
    const { unmount } = renderMap(fake.engine)
    const signal = fake.mount.mock.calls[0]![2]!

    expect(signal.aborted).toBe(false)
    unmount()
    expect(signal.aborted).toBe(true)
  })

  it('destroys an engine that finishes loading after unmount', async () => {
    const fake = fakeEngine()
    const { unmount } = renderMap(fake.engine)
    unmount()
    await fake.loaded()

    expect(fake.instance.destroy).toHaveBeenCalledTimes(1)
  })

  it('credits the tiles, linking those with an address', () => {
    const fake = fakeEngine()
    renderMap(fake.engine)

    expect(screen.getByRole('link', { name: /Tiles Co/ })).toHaveAttribute(
      'href',
      'https://tiles.example'
    )
    expect(screen.getByText('Mapmakers')).toBeInTheDocument()
  })

  it('says so in the frame when the map can’t load', async () => {
    const fake = fakeEngine()
    renderMap(fake.engine)
    await fake.failed()

    const region = screen.getByRole('region', { name: 'Map' })
    expect(region).toHaveAttribute('data-status', 'error')
    expect(screen.getByText('The map couldn’t load')).toBeInTheDocument()
  })

  it('stays in its frame, never filling the window, once it fails', async () => {
    const fake = fakeEngine()
    const { rerender } = renderMap(fake.engine)
    await fake.failed()
    rerender(
      <MapEngineContext value={fake.engine}>
        <Map defaultCenter={venue} expanded />
      </MapEngineContext>
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('The map couldn’t load')).toBeVisible()
  })

  it('renders its frame on the server, and the rest after mount', () => {
    const html = renderToString(
      <MapEngineContext value={fakeEngine().engine}>
        <Map defaultCenter={venue} defaultExpanded>
          <p>Part</p>
        </Map>
      </MapEngineContext>
    )

    expect(html).toContain('data-slot="map"')
    expect(html).not.toContain('Part')
  })

  describe('credits', () => {
    const creditsButton = () =>
      screen.getByRole('button', { name: 'Map credits' })

    it('are open when the map loads', async () => {
      const fake = fakeEngine()
      renderMap(fake.engine)
      await fake.loaded()

      expect(creditsButton()).toHaveAttribute('aria-expanded', 'true')
    })

    it('collapse once the map moves', async () => {
      const fake = fakeEngine()
      renderMap(fake.engine)
      await fake.loaded()
      await fake.moved()

      expect(creditsButton()).toHaveAttribute('aria-expanded', 'false')
    })

    it('collapse five seconds after the map loads', async () => {
      vi.useFakeTimers()
      try {
        const fake = fakeEngine()
        renderMap(fake.engine)
        await fake.loaded()
        act(() => vi.advanceTimersByTime(4_999))
        expect(creditsButton()).toHaveAttribute('aria-expanded', 'true')
        act(() => vi.advanceTimersByTime(1))

        expect(creditsButton()).toHaveAttribute('aria-expanded', 'false')
      } finally {
        vi.useRealTimers()
      }
    })

    it('open again from the button', async () => {
      const fake = fakeEngine()
      renderMap(fake.engine)
      await fake.loaded()
      await fake.moved()
      act(() => creditsButton().click())

      expect(creditsButton()).toHaveAttribute('aria-expanded', 'true')
      expect(
        document.getElementById(creditsButton().getAttribute('aria-controls')!)
      ).toHaveTextContent('Tiles Co')
    })
  })
})
