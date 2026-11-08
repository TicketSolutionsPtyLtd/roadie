import type { ReactNode } from 'react'

import { act, render } from '@testing-library/react'
import { vi } from 'vitest'

import { MapProvider } from './MapProvider'
import type {
  LatLng,
  MapEngine,
  MapEngineInstance,
  MapPalette,
  MapView
} from './engine'
import { Map, type MapProps } from './index'

export const venue = { lat: -27.4575, lng: 153.0355 }

/** A grey basemap palette for engines under test. */
export const testPalette: MapPalette = {
  land: 'rgb(244, 244, 244)',
  park: 'rgb(232, 232, 232)',
  water: 'rgb(210, 210, 210)',
  building: 'rgb(224, 224, 224)',
  road: 'rgb(255, 255, 255)',
  roadMajor: 'rgb(255, 255, 255)',
  roadCasing: 'rgb(200, 200, 200)',
  rail: 'rgb(180, 180, 180)',
  border: 'rgb(160, 160, 160)',
  label: 'rgb(80, 80, 80)',
  labelHalo: 'rgb(244, 244, 244)'
}

/**
 * An engine with a flat projection: a degree is 1,000px, centred on the
 * view's centre in a 400×300 frame. Tests drive its moves and clicks.
 */
export function fakeEngine(
  attribution: MapEngine['attribution'] = [{ label: 'Tiles Co' }]
) {
  let view: MapView = { center: venue, zoom: 14 }
  const moves = new Set<() => void>()
  const clicks = new Set<(place: LatLng) => void>()
  const instance: MapEngineInstance = {
    getView: () => view,
    setView: vi.fn((next: Partial<MapView>) => {
      view = { ...view, ...next }
      for (const move of moves) move()
    }),
    project: ({ lat, lng }) => ({
      x: 200 + (lng - view.center.lng) * 1000,
      y: 150 - (lat - view.center.lat) * 1000
    }),
    unproject: ({ x, y }) => ({
      lat: view.center.lat - (y - 150) / 1000,
      lng: view.center.lng + (x - 200) / 1000
    }),
    on: ((event: 'move' | 'click', listener: (place: LatLng) => void) => {
      if (event === 'click') {
        clicks.add(listener)
        return () => clicks.delete(listener)
      }
      const move = () => listener(view.center)
      moves.add(move)
      return () => moves.delete(move)
    }) as MapEngineInstance['on'],
    setPalette: vi.fn(),
    setAreas: vi.fn(),
    setCooperativeGestures: vi.fn(),
    destroy: vi.fn()
  }
  const engine: MapEngine = {
    attribution,
    mount: vi.fn(async () => instance)
  }
  return {
    engine,
    instance,
    /** Pans the map so its centre moves to `center`. */
    pan: (center: LatLng) =>
      act(() => {
        instance.setView({ center })
      }),
    click: (place: LatLng) =>
      act(() => {
        for (const click of clicks) click(place)
      })
  }
}

/** Renders a map with the fake engine and waits for it to be ready. */
type RenderedMap = ReturnType<typeof render> & {
  /** Renders the same map with other parts in it. */
  rerenderMap: (parts?: ReactNode) => Promise<void>
}

export async function renderMap(
  engine: MapEngine,
  children?: ReactNode,
  props?: Partial<MapProps>
): Promise<RenderedMap> {
  const tree = (parts?: ReactNode) => (
    <MapProvider engine={engine}>
      <Map defaultCenter={venue} {...props}>
        {parts}
      </Map>
    </MapProvider>
  )
  const result = render(tree(children))
  await act(async () => {})
  return {
    ...result,
    rerenderMap: async (parts?: ReactNode) => {
      result.rerender(tree(parts))
      await act(async () => {})
    }
  }
}
