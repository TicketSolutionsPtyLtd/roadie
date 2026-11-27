'use client'

import type { ReactNode } from 'react'

import { MapEngineContext } from './MapEngineContext'
import type { MapEngine } from './engine'

export type MapProviderProps = {
  /**
   * What draws every map inside, with its tiles. MapLibre with OpenFreeMap
   * tiles when there's no provider.
   */
  engine: MapEngine
  children?: ReactNode
}

/**
 * Picks the engine and tiles for the maps inside it, once for an app. Show a
 * provider's search results on that provider's map: Google Places results
 * on a Google map, for instance.
 */
export function MapProvider({ engine, children }: MapProviderProps) {
  return <MapEngineContext value={engine}>{children}</MapEngineContext>
}
