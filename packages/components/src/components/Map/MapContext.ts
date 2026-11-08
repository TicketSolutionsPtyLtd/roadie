'use client'

import { type RefObject, createContext, use } from 'react'

import type { LatLng, MapAreaLayer, MapEngineInstance } from './engine'

export type MapContextValue = {
  /** The drawn map, once its engine is ready. */
  instance: MapEngineInstance | null
  /**
   * The map's viewport, which holds the engine and every part, inline or
   * filling the window. Its box is the map's, for parts that read pointer
   * positions or colours.
   */
  frame: RefObject<HTMLDivElement | null>
  /** Adds, replaces or, with `null`, removes an area the map draws. */
  setArea: (id: string, area: MapAreaLayer | null) => void
  /** Whether the map fills the window. */
  expanded: boolean
  /** Asks the map to fill the window, or to go back. */
  setExpanded: (expanded: boolean) => void
  /**
   * Where previews portal while the map fills the window, so they show
   * inside it; `null` inline.
   */
  portalContainer: HTMLElement | null
  /**
   * Says a toolbar is in the map, which then shows the way back from filling
   * the window. Returns its removal.
   */
  addToolbar: () => () => void
  /**
   * Listens for a click or tap on the map, as the engine's `click` does, but
   * skips one whose press closed a list over the map. Returns its removal.
   */
  onMapClick: (listener: (place: LatLng) => void) => () => void
  /**
   * Says this press closed a list over the map, such as Map.Search's, so its
   * click on the map only closes the list.
   */
  ignoreClickFrom: (press: Event) => void
}

export const MapContext = createContext<MapContextValue | null>(null)

/** The map a part sits in. Parts render only inside `Map`. */
export function useMapContext(part: string): MapContextValue {
  const value = use(MapContext)
  if (!value) throw new Error(`${part} must be inside Map`)
  return value
}
