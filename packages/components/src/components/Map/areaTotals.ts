import type { MapAreaValue } from './MapAreas'
import type { LatLng } from './engine'
import { type AreaBox, areaBox, areaContains } from './geometry'
import {
  type MapAreaCollection,
  type MapAreaFeature,
  type MapAreaTopology,
  areaFeatures
} from './topology'

type Boxed = MapAreaFeature & { box: AreaBox }

// The areas, in a grid of cells that each list the areas whose bounds touch
// them, so a place is checked against the few areas near it, not all of them.
type AreaIndex = {
  idProperty: string | undefined
  west: number
  south: number
  cell: number
  columns: number
  cells: Map<number, Boxed[]>
}

// Cells along the areas' longer side: a few areas a cell for boundaries
// such as a country's postcodes, with the grid still small.
const GRID = 256

// Kept per boundaries, as totals are asked for again whenever the places
// change, such as with a date filter, and the boundaries stay the same.
const indexes = new WeakMap<object, AreaIndex>()

function indexOf(
  areas: MapAreaCollection | MapAreaTopology,
  idProperty: string | undefined
): AreaIndex {
  const known = indexes.get(areas)
  if (known && known.idProperty === idProperty) return known
  const boxed = areaFeatures(areas, { idProperty }).map((feature): Boxed => ({
    ...feature,
    box: areaBox(feature.geometry)
  }))
  let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const { box } of boxed) {
    west = Math.min(west, box[0])
    south = Math.min(south, box[1])
    east = Math.max(east, box[2])
    north = Math.max(north, box[3])
  }
  // Areas with no extent, or none at all, share one cell.
  const cell = Math.max(east - west, north - south) / GRID || 1
  const columns = GRID + 1
  const cells = new Map<number, Boxed[]>()
  for (const area of boxed) {
    const [left, bottom, right, top] = area.box.map((edge, i) =>
      Math.floor((edge - (i % 2 === 0 ? west : south)) / cell)
    ) as AreaBox
    for (let x = left; x <= right; x++)
      for (let y = bottom; y <= top; y++) {
        const key = x + y * columns
        const listed = cells.get(key)
        if (listed) listed.push(area)
        else cells.set(key, [area])
      }
  }
  const index = { idProperty, west, south, cell, columns, cells }
  indexes.set(areas, index)
  return index
}

/**
 * Totals by area for places, such as a point for each sale: each place adds
 * its value, or 1, to the area that holds it. Gives the areas with a total,
 * largest first, as `Map.Areas` takes them in `data`. A place in no area is
 * left out, as is a value that's negative or not a number.
 *
 * For a feed of places you can't change. Totals from your server are
 * better: they keep each person's place out of the browser.
 */
export function areaTotals(
  areas: MapAreaCollection | MapAreaTopology,
  places: readonly { position: LatLng; value?: number }[],
  { idProperty }: { idProperty?: string } = {}
): MapAreaValue[] {
  const { west, south, cell, columns, cells } = indexOf(areas, idProperty)
  const totals = new Map<string, number>()
  for (const { position, value = 1 } of places) {
    if (!(value > 0) || !Number.isFinite(value)) continue
    const { lat, lng } = position
    const x = Math.floor((lng - west) / cell)
    const y = Math.floor((lat - south) / cell)
    // Off the grid's sides, where a key would land in another row.
    if (!(x >= 0 && x < columns)) continue
    const area = cells
      .get(x + y * columns)
      ?.find(
        ({ box, geometry }) =>
          lng >= box[0] &&
          lng <= box[2] &&
          lat >= box[1] &&
          lat <= box[3] &&
          areaContains(geometry, position)
      )
    if (area) totals.set(area.id, (totals.get(area.id) ?? 0) + value)
  }
  return [...totals]
    .map(([id, value]) => ({ id, value }))
    .sort((a, b) => b.value - a.value)
}
