import Supercluster from 'supercluster'

import type { LatLng, MapEngineInstance } from './engine'

/** A place with a value, such as a postcode and the tickets sold there. */
export type MapClusterPoint = {
  position: LatLng
  /**
   * What the place adds to its group, such as tickets sold. A negative or
   * missing number adds nothing.
   * @default 1
   */
  value?: number
  /** Names the place in a group's preview, such as a postcode or suburb. */
  label?: string
}

/** Places near each other at a zoom, drawn as one band. */
export type MapClusterGroup = {
  /** Stays the same for this group as the map moves. */
  key: string
  position: LatLng
  /** The sum of its places' values. */
  value: number
  /** The zoom where it splits, or none for a single place. */
  splitsAt?: number
}

type Place = { key: string; value: number; label?: string }
type Sum = { value: number }

// Places closer than this on screen, in px, share a band: about a band's
// width, so bands never sit on top of each other.
const RADIUS = 56
// Past this zoom every place is its own band, so a group always splits at a
// zoom both engines reach: MapLibre's 22, and Google's 21, which is 20 here.
const MAX_ZOOM = 19

/**
 * Groups places by distance at each zoom, as one hierarchy, so a group
 * splits into the groups inside it as the map zooms in.
 */
export function clusterIndex(points: readonly MapClusterPoint[]) {
  // Places at the same spot never split, so they're one place from the start.
  const merged = new Map<string, { position: LatLng } & Place>()
  const names = new Map<string, string[]>()
  for (const { position, value = 1, label } of points) {
    // A negative or missing number adds nothing.
    const amount = Number.isFinite(value) && value > 0 ? value : 0
    const spot = `${position.lat},${position.lng}`
    const same = merged.get(spot)
    if (same) same.value += amount
    else merged.set(spot, { key: `p${merged.size}`, position, value: amount })
    const spotNames = names.get(spot) ?? []
    if (label && !spotNames.includes(label)) spotNames.push(label)
    names.set(spot, spotNames)
  }
  for (const [spot, place] of merged) {
    const spotNames = names.get(spot)!
    if (spotNames.length > 0) place.label = listOf(spotNames)
  }
  const places = [...merged.values()]
  const total = places.reduce((sum, { value }) => sum + value, 0)
  const index = new Supercluster<Place, Sum>({
    radius: RADIUS,
    maxZoom: MAX_ZOOM,
    map: ({ value }) => ({ value }),
    reduce: (sum, { value }) => {
      sum.value += value
    }
  })
  index.load(
    places.map(({ position, ...place }) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [position.lng, position.lat] },
      properties: place
    }))
  )

  const largest = new Map<number, number>()
  const groupsAt = (
    bbox: readonly [number, number, number, number],
    zoom: number
  ): MapClusterGroup[] =>
    places.length === 0
      ? []
      : index.getClusters([...bbox], zoom).map(({ geometry, properties }) => {
          const [lng, lat] = geometry.coordinates as [number, number]
          const position = { lat, lng }
          if ('cluster' in properties)
            return {
              key: `c${properties.cluster_id}`,
              position,
              value: properties.value,
              splitsAt: index.getClusterExpansionZoom(properties.cluster_id)
            }
          return { key: properties.key, position, value: properties.value }
        })

  return {
    /** Every place's value, added up. */
    total,
    /** The groups in these bounds, `[west, south, east, north]`, at a zoom. */
    groupsAt,
    /** The largest group's value at a zoom, anywhere on the map. */
    largestAt(zoom: number) {
      const level = Math.floor(zoom)
      let value = largest.get(level)
      if (value === undefined) {
        value = Math.max(
          0,
          ...groupsAt([-180, -85, 180, 85], level).map((group) => group.value)
        )
        largest.set(level, value)
      }
      return value
    },
    /** The keys of the groups a group splits into. */
    partsOf(group: MapClusterGroup): string[] {
      if (!group.key.startsWith('c')) return []
      return index
        .getChildren(Number(group.key.slice(1)))
        .map(({ properties }) =>
          'cluster' in properties ? `c${properties.cluster_id}` : properties.key
        )
    },
    /** The places in a group, largest first. */
    placesIn(group: MapClusterGroup): ({ position: LatLng } & Place)[] {
      if (!group.key.startsWith('c'))
        return places.filter(({ key }) => key === group.key)
      return index
        .getLeaves(Number(group.key.slice(1)), Infinity)
        .map(({ geometry, properties }) => {
          const [lng, lat] = geometry.coordinates as [number, number]
          return { ...properties, position: { lat, lng } }
        })
        .sort((a, b) => b.value - a.value)
    }
  }
}

export type ClusterIndex = ReturnType<typeof clusterIndex>

/** Names as a list a person reads: "A, B and C". */
export function listOf(items: readonly string[]) {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

/**
 * The zoom groups are made at, from how far apart the engine draws two
 * places: a 512px world is 0, and each step doubles it. Engines number
 * their zooms differently (Google's 1 is MapLibre's 0), so grouping reads
 * the drawing, not the number.
 */
export function gridZoom(instance: MapEngineInstance) {
  const { center } = instance.getView()
  const here = instance.project(center)
  const east = instance.project({ lat: center.lat, lng: center.lng + 1 })
  return Math.log2((Math.abs(east.x - here.x) * 360) / 512)
}
