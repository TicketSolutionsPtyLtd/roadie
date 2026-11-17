import { createRef } from 'react'

import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Toolbar } from '@oztix/roadie-components/toolbar'

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
