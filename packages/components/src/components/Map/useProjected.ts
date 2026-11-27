'use client'

import { useCallback, useSyncExternalStore } from 'react'

import type { LatLng, MapEngineInstance, MapPixel } from './engine'

const noSubscription = () => () => {}

/**
 * Where a place sits in the map's frame, following the map as it moves.
 * Null until the map is ready, and on the server.
 */
export function useProjected(
  instance: MapEngineInstance | null,
  place: LatLng | null
): MapPixel | null {
  const subscribe = useCallback(
    (onChange: () => void) =>
      instance ? instance.on('move', onChange) : noSubscription(),
    [instance]
  )
  // Whole pixels keep pins crisp, and a string means an unchanged position
  // never re-renders.
  const key = useSyncExternalStore(
    subscribe,
    () => {
      if (!instance || !place) return ''
      const { x, y } = instance.project(place)
      return `${Math.round(x)} ${Math.round(y)}`
    },
    () => ''
  )
  if (!key) return null
  const [x, y] = key.split(' ').map(Number) as [number, number]
  return { x, y }
}
