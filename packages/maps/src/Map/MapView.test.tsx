import { StrictMode, createRef } from 'react'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Toolbar } from '@oztix/roadie-components/toolbar'

import { MapProvider } from './MapProvider'
import type { MapActions } from './MapRoot'
import type { MapAreaGeometry } from './engine'
import { Map } from './index'
import { fakeEngine, renderMap, venue } from './mapTestUtils'

const east = { lat: venue.lat, lng: venue.lng + 0.05 }
const north = { lat: venue.lat + 0.02, lng: venue.lng }

describe('Map view', () => {
  it('starts at center and zoom, and moves when they change', async () => {
    const fake = fakeEngine()
    const view = await renderMap(fake.engine, null, {
      defaultCenter: undefined,
      center: venue,
      zoom: 12
    })
    expect(fake.engine.mount).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ center: venue, zoom: 12 }),
      expect.anything()
    )

    await view.rerenderMap(null, {
      defaultCenter: undefined,
      center: east,
      zoom: 15
    })
    expect(fake.instance.setView).toHaveBeenLastCalledWith(
      { center: east, zoom: 15 },
      { animate: true }
    )
  })

  it('says where the map settles, after the reader pans', async () => {
    const fake = fakeEngine()
    const onViewChange = vi.fn()
    await renderMap(fake.engine, null, { onViewChange })

    await fake.pan(east)
    expect(onViewChange).toHaveBeenLastCalledWith({ center: east, zoom: 14 })
  })

  it('stays put when center comes back as where the map settled', async () => {
    const fake = fakeEngine()
    const view = await renderMap(fake.engine, null, {
      defaultCenter: undefined,
      center: venue,
      zoom: 14
    })
    await fake.pan(east)
    fake.instance.setView = vi.fn()

    await view.rerenderMap(null, {
      defaultCenter: undefined,
      center: east,
      zoom: 14
    })
    expect(fake.instance.setView).not.toHaveBeenCalled()
  })

  it('flies to a view from actionsRef', async () => {
    const fake = fakeEngine()
    const actionsRef = createRef<MapActions>()
    await renderMap(fake.engine, null, { actionsRef })

    act(() => actionsRef.current!.flyTo({ center: north, zoom: 16 }))
    expect(fake.instance.setView).toHaveBeenLastCalledWith(
      { center: north, zoom: 16 },
      { animate: true }
    )
  })

  it('fits every pin and area on the map from actionsRef', async () => {
    const fake = fakeEngine()
    const actionsRef = createRef<MapActions>()
    const site: MapAreaGeometry = {
      type: 'Polygon',
      coordinates: [
        [
          [153.0, -27.5],
          [153.01, -27.5],
          [153.01, -27.49],
          [153.0, -27.5]
        ]
      ]
    }
    await renderMap(
      fake.engine,
      <>
        <Map.Marker position={east} label='Kazoo Hollow Room' />
        <Map.Marker position={north} label='Foxglove Tin Pavilion' />
        <Map.Area area={site} label='Barnacle Bowl grounds' />
      </>,
      { actionsRef }
    )

    act(() => actionsRef.current!.fitTo())
    expect(fake.instance.fitBounds).toHaveBeenLastCalledWith(
      {
        southWest: { lat: -27.5, lng: 153.0 },
        northEast: { lat: north.lat, lng: east.lng }
      },
      expect.objectContaining({ animate: true, padding: 48, maxZoom: 16 })
    )
  })

  it('fits the places it is given from actionsRef', async () => {
    const fake = fakeEngine()
    const actionsRef = createRef<MapActions>()
    await renderMap(fake.engine, null, { actionsRef })

    act(() => actionsRef.current!.fitTo([venue, east]))
    expect(fake.instance.fitBounds).toHaveBeenLastCalledWith(
      { southWest: venue, northEast: east },
      expect.objectContaining({ animate: true })
    )
  })

  it('fits places either side of the date line across it, not round the world', async () => {
    const fake = fakeEngine()
    const actionsRef = createRef<MapActions>()
    await renderMap(fake.engine, null, { actionsRef })
    const suva = { lat: -18.1416, lng: 178.4419 }
    const taveuni = { lat: -16.8, lng: -179.98 }

    act(() => actionsRef.current!.fitTo([taveuni, suva]))
    const [{ southWest, northEast }] = vi.mocked(fake.instance.fitBounds).mock
      .calls[0]!
    expect(southWest).toEqual(suva)
    expect(northEast.lat).toBe(taveuni.lat)
    // East of the date line, counted on past 180.
    expect(northEast.lng).toBeCloseTo(180.02)
  })

  it('fits an area wider than half the world along it, not round the back', async () => {
    const fake = fakeEngine()
    const wide: MapAreaGeometry = {
      type: 'Polygon',
      coordinates: [
        [
          [-100, -10],
          [-50, -10],
          [0, -10],
          [50, -10],
          [100, -10],
          [100, 10],
          [50, 10],
          [0, 10],
          [-50, 10],
          [-100, 10],
          [-100, -10]
        ]
      ]
    }
    await renderMap(
      fake.engine,
      <>
        <Map.Toolbar fit />
        <Map.Area area={wide} label='Touring region' />
      </>
    )

    await userEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(fake.instance.fitBounds).toHaveBeenLastCalledWith(
      {
        southWest: { lat: -10, lng: -100 },
        northEast: { lat: 10, lng: 100 }
      },
      expect.anything()
    )
  })

  it('fits an area across the date line with a pin inside it', async () => {
    const fake = fakeEngine()
    const islands: MapAreaGeometry = {
      type: 'Polygon',
      coordinates: [
        [
          [170, -18],
          [179, -18],
          [-170, -18],
          [-170, -16],
          [170, -16],
          [170, -18]
        ]
      ]
    }
    await renderMap(
      fake.engine,
      <>
        <Map.Toolbar fit />
        <Map.Area area={islands} label='Islands' />
        <Map.Marker
          position={{ lat: -17, lng: -179 }}
          label='Kazoo Hollow Room'
        />
      </>
    )

    await userEvent.click(screen.getByRole('button', { name: 'Show all' }))
    const [{ southWest, northEast }] = vi.mocked(fake.instance.fitBounds).mock
      .lastCall!
    expect(southWest).toEqual({ lat: -18, lng: 170 })
    // East of the date line, counted on past 180.
    expect(northEast).toEqual({ lat: -16, lng: 190 })
  })

  it('does nothing when there is nothing to fit', async () => {
    const fake = fakeEngine()
    const actionsRef = createRef<MapActions>()
    await renderMap(fake.engine, null, { actionsRef })

    act(() => actionsRef.current!.fitTo())
    expect(fake.instance.fitBounds).not.toHaveBeenCalled()
  })
})

describe('Map.Toolbar extras', () => {
  it('shows every pin from Show all', async () => {
    const fake = fakeEngine()
    await renderMap(
      fake.engine,
      <>
        <Map.Toolbar fit />
        <Map.Marker position={east} label='Kazoo Hollow Room' />
        <Map.Marker position={north} label='Foxglove Tin Pavilion' />
      </>
    )

    await userEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(fake.instance.fitBounds).toHaveBeenLastCalledWith(
      {
        southWest: { lat: venue.lat, lng: venue.lng },
        northEast: { lat: north.lat, lng: east.lng }
      },
      expect.anything()
    )
  })

  it('turns Show all off while there is nothing to show', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, <Map.Toolbar fit />)

    expect(screen.getByRole('button', { name: 'Show all' })).toBeDisabled()
  })

  it('puts an app’s own buttons in Map controls, apart from Zoom', async () => {
    const fake = fakeEngine()
    await renderMap(
      fake.engine,
      <Map.Toolbar>
        <Toolbar.Button aria-label='Layers'>L</Toolbar.Button>
      </Map.Toolbar>
    )

    const controls = screen.getByRole('toolbar', { name: 'Map controls' })
    expect(
      within(controls).getByRole('button', { name: 'Layers' })
    ).toBeTruthy()
    const zoom = screen.getByRole('toolbar', { name: 'Zoom' })
    expect(within(zoom).queryByRole('button', { name: 'Layers' })).toBeNull()
  })

  it('leaves Show all out unless asked', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, <Map.Toolbar />)

    expect(screen.queryByRole('button', { name: 'Show all' })).toBeNull()
  })
})

describe('Map defaultFit', () => {
  const pins = (
    <>
      <Map.Marker position={east} label='Kazoo Hollow Room' />
      <Map.Marker position={north} label='Foxglove Tin Pavilion' />
    </>
  )
  const bothPins = {
    southWest: { lat: venue.lat, lng: venue.lng },
    northEast: { lat: north.lat, lng: east.lng }
  }

  it('opens on the pins it mounts with, without easing', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, pins, { defaultFit: true })

    expect(fake.instance.fitBounds).toHaveBeenCalledTimes(1)
    expect(fake.instance.fitBounds).toHaveBeenCalledWith(bothPins, {
      animate: false,
      padding: 48,
      maxZoom: 16
    })
  })

  it('leaves the view alone unless asked', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, pins)

    expect(fake.instance.fitBounds).not.toHaveBeenCalled()
  })

  it('eases to pins that arrive after it has loaded', async () => {
    const fake = fakeEngine()
    const view = await renderMap(fake.engine, null, { defaultFit: true })
    expect(fake.instance.fitBounds).not.toHaveBeenCalled()

    await view.rerenderMap(pins)
    expect(fake.instance.fitBounds).toHaveBeenCalledTimes(1)
    expect(fake.instance.fitBounds).toHaveBeenCalledWith(
      bothPins,
      expect.objectContaining({ animate: true })
    )
    // A move the reader sees folds the credits, as any move does.
    expect(screen.getByRole('button', { name: 'Map credits' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('fits once, so a pin added later moves nothing', async () => {
    const fake = fakeEngine()
    const view = await renderMap(
      fake.engine,
      <Map.Marker position={east} label='Kazoo Hollow Room' />,
      { defaultFit: true }
    )
    expect(fake.instance.fitBounds).toHaveBeenCalledTimes(1)

    await view.rerenderMap(pins)
    expect(fake.instance.fitBounds).toHaveBeenCalledTimes(1)
  })

  const surface = () =>
    document.querySelector<HTMLElement>('[data-slot="map-surface"]')!

  const finger = { pointerType: 'touch', isPrimary: true }

  it.each([
    ['presses', () => fireEvent.pointerDown(surface())],
    [
      'taps',
      () => {
        fireEvent.pointerDown(surface(), finger)
        fireEvent.pointerUp(surface(), finger)
      }
    ],
    [
      'puts two fingers on',
      () => {
        fireEvent.pointerDown(surface(), finger)
        fireEvent.pointerDown(surface(), { ...finger, isPrimary: false })
      }
    ],
    ['uses a key on', () => fireEvent.keyDown(surface(), { key: 'ArrowLeft' })],
    [
      'holds Ctrl and scrolls on',
      () => fireEvent.wheel(surface(), { deltaY: -100, ctrlKey: true })
    ],
    [
      'holds ⌘ and scrolls on',
      () => fireEvent.wheel(surface(), { deltaY: -100, metaKey: true })
    ]
  ])(
    'stays put when the reader %s the map before the pins arrive',
    async (_, use) => {
      const fake = fakeEngine()
      const view = await renderMap(fake.engine, null, { defaultFit: true })
      use()

      await view.rerenderMap(pins)
      expect(fake.instance.fitBounds).not.toHaveBeenCalled()
      // And it has given up: a second pin doesn't fit either.
      await view.rerenderMap(
        <>
          {pins}
          <Map.Marker position={venue} label='Wombat Lane Hall' />
        </>
      )
      expect(fake.instance.fitBounds).not.toHaveBeenCalled()
    }
  )

  // Tab and Shift move focus, and inline, a plain scroll and one finger move
  // the page. None of them uses the map.
  it.each([
    ['Tab passes through', () => fireEvent.keyDown(surface(), { key: 'Tab' })],
    [
      'Shift and Tab pass back through',
      () => {
        fireEvent.keyDown(surface(), { key: 'Shift', shiftKey: true })
        fireEvent.keyDown(surface(), { key: 'Tab', shiftKey: true })
      }
    ],
    [
      'a plain scroll moves the page across',
      () => fireEvent.wheel(surface(), { deltaY: 100 })
    ],
    [
      'one finger moves the page across',
      () => {
        fireEvent.pointerDown(surface(), finger)
        fireEvent.pointerCancel(surface(), finger)
      }
    ]
  ])('still eases to the pins after %s the map', async (_, pass) => {
    const fake = fakeEngine()
    const view = await renderMap(fake.engine, null, { defaultFit: true })
    pass()

    await view.rerenderMap(pins)
    expect(fake.instance.fitBounds).toHaveBeenCalledTimes(1)
    expect(fake.instance.fitBounds).toHaveBeenCalledWith(
      bothPins,
      expect.objectContaining({ animate: true })
    )
  })

  it.each([
    ['a plain scroll', () => fireEvent.wheel(surface(), { deltaY: -100 })],
    ['one finger', () => fireEvent.pointerDown(surface(), finger)]
  ])(
    'stays put when %s moves a map filling the window before the pins arrive',
    async (_, use) => {
      const fake = fakeEngine()
      const props = { defaultFit: true, defaultExpanded: true }
      const view = await renderMap(fake.engine, null, props)
      use()

      await view.rerenderMap(pins, props)
      expect(fake.instance.fitBounds).not.toHaveBeenCalled()
    }
  )

  it('opens on its pins though the reader pressed the map while it loaded', async () => {
    const fake = fakeEngine()
    render(
      <MapProvider engine={fake.engine}>
        <Map defaultFit>{pins}</Map>
      </MapProvider>
    )
    // The engine isn't ready until the next tick, so there's no map to use.
    fireEvent.pointerDown(surface())
    fireEvent.keyDown(surface(), { key: 'ArrowLeft' })
    await act(async () => {})

    expect(fake.instance.fitBounds).toHaveBeenCalledTimes(1)
    expect(fake.instance.fitBounds).toHaveBeenCalledWith(
      bothPins,
      expect.objectContaining({ animate: false })
    )
  })

  it('opens on its pins though fitTo and flyTo were called while it loaded', async () => {
    const fake = fakeEngine()
    const actionsRef = createRef<MapActions>()
    render(
      <MapProvider engine={fake.engine}>
        <Map defaultFit actionsRef={actionsRef}>
          {pins}
        </Map>
      </MapProvider>
    )
    act(() => {
      actionsRef.current!.fitTo([north])
      actionsRef.current!.flyTo({ zoom: 9 })
    })
    await act(async () => {})

    expect(fake.instance.setView).not.toHaveBeenCalled()
    expect(fake.instance.fitBounds).toHaveBeenCalledTimes(1)
    expect(fake.instance.fitBounds).toHaveBeenCalledWith(
      bothPins,
      expect.objectContaining({ animate: false })
    )
  })

  it('still eases to the pins after fitTo found nothing to fit', async () => {
    const fake = fakeEngine()
    const actionsRef = createRef<MapActions>()
    const props = { defaultFit: true, actionsRef }
    const view = await renderMap(fake.engine, null, props)
    act(() => actionsRef.current!.fitTo())

    await view.rerenderMap(pins, props)
    expect(fake.instance.fitBounds).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['north', north],
    ['east', east]
  ])(
    'still eases to the pins after the engine moves %s on its own, as a resize can',
    async (_, to) => {
      const fake = fakeEngine()
      const view = await renderMap(fake.engine, null, { defaultFit: true })
      await fake.pan(to)

      await view.rerenderMap(pins)
      expect(fake.instance.fitBounds).toHaveBeenCalledTimes(1)
      expect(fake.instance.fitBounds).toHaveBeenCalledWith(
        bothPins,
        expect.objectContaining({ animate: true })
      )
    }
  )

  it('leaves the map where it is when the reader drops a pin', async () => {
    const fake = fakeEngine()
    const onValueChange = vi.fn()
    await renderMap(fake.engine, <Map.Picker onValueChange={onValueChange} />, {
      defaultFit: true
    })
    // A click on the map is a press on it, then the engine's click.
    fireEvent.pointerDown(surface())
    await fake.click(east)

    expect(onValueChange).toHaveBeenCalled()
    expect(fake.instance.fitBounds).not.toHaveBeenCalled()
  })

  it('opens on a picker’s place when it starts with one', async () => {
    const fake = fakeEngine()
    await renderMap(
      fake.engine,
      <Map.Picker defaultValue={{ position: east, label: 'Side door' }} />,
      { defaultFit: true }
    )

    expect(fake.instance.fitBounds).toHaveBeenCalledTimes(1)
    expect(fake.instance.fitBounds).toHaveBeenCalledWith(
      { southWest: east, northEast: east },
      expect.objectContaining({ animate: false })
    )
  })

  it('opens on its pins again when the engine is swapped for another', async () => {
    const first = fakeEngine()
    const second = fakeEngine()
    const tree = (engine: typeof first.engine) => (
      <MapProvider engine={engine}>
        <Map defaultFit>{pins}</Map>
      </MapProvider>
    )
    const view = render(tree(first.engine))
    await act(async () => {})
    expect(first.instance.fitBounds).toHaveBeenCalledTimes(1)

    view.rerender(tree(second.engine))
    await act(async () => {})
    expect(second.instance.fitBounds).toHaveBeenCalledTimes(1)
    expect(second.instance.fitBounds).toHaveBeenCalledWith(
      bothPins,
      expect.objectContaining({ animate: false })
    )
  })

  it('leaves a swapped engine where it starts without defaultFit', async () => {
    const first = fakeEngine()
    const second = fakeEngine()
    const tree = (engine: typeof first.engine) => (
      <MapProvider engine={engine}>
        <Map defaultCenter={venue}>{pins}</Map>
      </MapProvider>
    )
    const view = render(tree(first.engine))
    await act(async () => {})
    view.rerender(tree(second.engine))
    await act(async () => {})

    expect(second.engine.mount).toHaveBeenCalledTimes(1)
    expect(second.instance.fitBounds).not.toHaveBeenCalled()
  })

  it('stays put when fitTo has already moved the map, and when a controlled centre has', async () => {
    const fake = fakeEngine()
    const actionsRef = createRef<MapActions>()
    const view = await renderMap(fake.engine, null, {
      defaultFit: true,
      actionsRef
    })
    act(() => actionsRef.current!.fitTo([north]))
    expect(fake.instance.fitBounds).toHaveBeenCalledTimes(1)
    await view.rerenderMap(pins, { defaultFit: true, actionsRef })
    expect(fake.instance.fitBounds).toHaveBeenCalledTimes(1)
    view.unmount()

    const later = fakeEngine()
    const controlled = await renderMap(later.engine, null, { defaultFit: true })
    await controlled.rerenderMap(null, { defaultFit: true, center: east })
    await controlled.rerenderMap(pins, { defaultFit: true, center: east })
    expect(later.instance.fitBounds).not.toHaveBeenCalled()
  })

  it('stays put when the app moves the map before the pins arrive', async () => {
    const fake = fakeEngine()
    const actionsRef = createRef<MapActions>()
    const view = await renderMap(fake.engine, null, {
      defaultFit: true,
      actionsRef
    })
    act(() => actionsRef.current!.flyTo({ zoom: 9 }))

    await view.rerenderMap(pins, { defaultFit: true, actionsRef })
    expect(fake.instance.fitBounds).not.toHaveBeenCalled()
  })

  it('gives way to a controlled centre or zoom, and says so', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const controlled of [{ center: venue }, { zoom: 12 }]) {
      const fake = fakeEngine()
      const view = await renderMap(fake.engine, pins, {
        defaultFit: true,
        ...controlled
      })
      expect(fake.instance.fitBounds).not.toHaveBeenCalled()
      view.unmount()
    }
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[0]![0]).toMatch(/defaultFit/)
    warn.mockRestore()
  })

  it('says nothing when it is not controlled', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fake = fakeEngine()
    await renderMap(fake.engine, pins, { defaultFit: true })

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('says nothing when it is set after first render with no centre or zoom', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fake = fakeEngine()
    const view = await renderMap(fake.engine, pins)
    await view.rerenderMap(pins, { defaultFit: true })

    expect(fake.instance.fitBounds).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('warns once in strict mode', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fake = fakeEngine()
    render(
      <StrictMode>
        <MapProvider engine={fake.engine}>
          <Map center={venue} defaultFit>
            {pins}
          </Map>
        </MapProvider>
      </StrictMode>
    )
    await act(async () => {})

    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('says nothing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const fake = fakeEngine()
      await renderMap(fake.engine, pins, { defaultFit: true, center: venue })

      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
      vi.unstubAllEnvs()
    }
  })

  it('tells onViewChange where it opened', async () => {
    const fake = fakeEngine()
    const onViewChange = vi.fn()
    await renderMap(fake.engine, pins, { defaultFit: true, onViewChange })

    expect(onViewChange).toHaveBeenCalledTimes(1)
    expect(onViewChange).toHaveBeenCalledWith({
      center: {
        lat: (venue.lat + north.lat) / 2,
        lng: (venue.lng + east.lng) / 2
      },
      zoom: 16
    })
  })

  it('opens with its credits showing, as a map with no fit does', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, pins, { defaultFit: true })

    expect(fake.instance.fitBounds).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Map credits' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
  })
})
