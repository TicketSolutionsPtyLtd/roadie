'use client'

import { type RefObject, createContext, use } from 'react'

import type { FieldContextValue } from '../Field/FieldContext'
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
  /**
   * Adds, moves or, with `null`, removes a place a part marks, such as a pin,
   * so fitting the map to its places includes it.
   */
  setPlace: (id: string, place: LatLng | null) => void
  /**
   * Fits the map to these places or, with none given, to every pin and area
   * on it.
   */
  fitTo: (places?: readonly LatLng[]) => void
  /** Whether the map has pins or areas to fit to. */
  canFit: boolean
  /**
   * The `Field` around the map, if any. Only `Map.Picker` takes its states:
   * the map's other parts, such as `Map.Search`, see no field.
   */
  field: FieldContextValue
  /**
   * Where form inputs go: in the page's frame, so they stay in the form
   * while the map fills the window.
   */
  formSlot: HTMLElement | null
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
