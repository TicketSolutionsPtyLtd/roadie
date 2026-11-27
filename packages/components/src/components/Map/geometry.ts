import type { LatLng, MapAreaGeometry } from './engine'

type Ring = [number, number][]

// Ray casting on [lng, lat] pairs: fine for areas the size of a venue or a
// suburb, where the earth's curve doesn't matter.
function inRing({ lat, lng }: LatLng, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[i]!
    const [x2, y2] = ring[j]!
    if (
      y1 > lat !== y2 > lat &&
      lng < ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1
    )
      inside = !inside
  }
  return inside
}

const polygonsOf = (area: MapAreaGeometry): Ring[][] =>
  area.type === 'Polygon' ? [area.coordinates] : area.coordinates

/** Whether a place is inside an area, outside any holes in it. */
export function areaContains(area: MapAreaGeometry, place: LatLng): boolean {
  return polygonsOf(area).some(
    ([outer, ...holes]) =>
      !!outer &&
      inRing(place, outer) &&
      !holes.some((hole) => inRing(place, hole))
  )
}

/** An area's bounds: its west, south, east and north edges. */
export type AreaBox = [west: number, south: number, east: number, north: number]

/** The bounds of an area's outlines. */
export function areaBox(area: MapAreaGeometry): AreaBox {
  const box: AreaBox = [Infinity, Infinity, -Infinity, -Infinity]
  for (const [outer = []] of polygonsOf(area))
    for (const [lng, lat] of outer) {
      box[0] = Math.min(box[0], lng)
      box[1] = Math.min(box[1], lat)
      box[2] = Math.max(box[2], lng)
      box[3] = Math.max(box[3], lat)
    }
  return box
}

/** The middle of an area's first outline: where its label and preview sit. */
export function areaCentre(area: MapAreaGeometry): LatLng {
  const outer = polygonsOf(area)[0]?.[0] ?? []
  const [first, last] = [outer[0], outer.at(-1)]
  // GeoJSON closes a ring by repeating its first point; count it once.
  const points =
    first && last && first[0] === last[0] && first[1] === last[1]
      ? outer.slice(0, -1)
      : outer
  if (points.length === 0) return { lat: 0, lng: 0 }
  const sum = points.reduce(([x, y], [lng, lat]) => [x + lng, y + lat], [0, 0])
  return { lat: sum[1] / points.length, lng: sum[0] / points.length }
}
