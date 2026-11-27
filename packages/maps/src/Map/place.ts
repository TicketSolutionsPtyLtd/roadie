import type { LatLng } from './engine'

/** A place a search found, such as a venue or an address. */
export type Place = {
  /** The name people pick it by, such as the venue or the street address. */
  label: string
  /** Where it is. */
  position: LatLng
  /** Its address, shown under the label in search results. */
  address?: string
  /**
   * How far in the map goes to show it. 16 shows a street.
   * @default 16
   */
  zoom?: number
  /**
   * `manual` when someone placed it by hand, by dropping, dragging or
   * nudging `Map.Picker`'s pin, rather than an address service.
   */
  precision?: 'manual'
  /** Where it came from, such as AddressFinder and its id there. */
  source?: { provider: string; id: string }
}

/** How far in the map goes to show a chosen place: a street. */
export const PLACE_ZOOM = 16
