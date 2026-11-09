import Supercluster from 'supercluster'

import type { LatLng, MapEngineInstance } from './engine'

/** A place with a value, such as a postcode and its total. */
export type MapClusterPoint = {
  position: LatLng
  /**
   * What the place adds to its group, such as its total. A negative or
   * missing number adds nothing.
   * @default 1
   */
  value?: number
  /** Names the place in a group's preview, such as a postcode or suburb. */
  label?: string
  /**
   * Places only group with places in the same region, such as a city or
   * state, so two cities never merge into one band however far out the map
   * is. Without one, places group by distance alone.
   */
  region?: string
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

type Place = {
  key: string
  value: number
  /** Every name given at this spot, as a list. */
  label?: string
  /** Every name given at this spot. */
  names: string[]
}
type Sum = { value: number }

// Places closer than this on screen, in px, share a band: about a band's
// width, so bands never sit on top of each other.
const RADIUS = 56
// Past this zoom every place is its own band, so a group always splits at a
// zoom both engines reach: MapLibre's 22, and Google's 21, which is 20 here.
const MAX_ZOOM = 19

// A group's key names its region's index and its cluster in it.
const clusterKey = (region: number, id: number) => `c${region}-${id}`
const parseClusterKey = (key: string) => {
  const match = /^c(\d+)-(\d+)$/.exec(key)
  return match ? { region: Number(match[1]), id: Number(match[2]) } : null
}

/**
 * Groups places by distance at each zoom, as one hierarchy, so a group
 * splits into the groups inside it as the map zooms in. Places in
 * different regions never share a group.
 */
export function clusterIndex(points: readonly MapClusterPoint[]) {
  // Places at the same spot in a region never split, so they're one place
  // from the start.
  const merged = new Map<string, { position: LatLng; region: string } & Place>()
  for (const { position, value = 1, label, region = '' } of points) {
    // A negative or missing number adds nothing.
    const amount = Number.isFinite(value) && value > 0 ? value : 0
    const spot = `${region}\u0000${position.lat},${position.lng}`
    const place = merged.get(spot) ?? {
      key: `p${merged.size}`,
      position,
      region,
      value: 0,
      names: []
    }
    place.value += amount
    if (label && !place.names.includes(label)) place.names.push(label)
    merged.set(spot, place)
  }
  for (const place of merged.values())
    if (place.names.length > 0) place.label = listOf(place.names)
  const places = [...merged.values()]
  const total = places.reduce((sum, { value }) => sum + value, 0)

  const regions = [...new Set(places.map(({ region }) => region))]
  const indexes = regions.map((region) => {
    const index = new Supercluster<Place, Sum>({
      radius: RADIUS,
      maxZoom: MAX_ZOOM,
      map: ({ value }) => ({ value }),
      reduce: (sum, { value }) => {
        sum.value += value
      }
    })
    return index.load(
      places
        .filter((place) => place.region === region)
        .map(({ position, region: _region, ...place }) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [position.lng, position.lat]
          },
          properties: place
        }))
    )
  })

  const keyOf = (
    region: number,
    properties: Place | (Sum & { cluster: true; cluster_id: number })
  ) =>
    'cluster' in properties
      ? clusterKey(region, properties.cluster_id)
      : properties.key

  const largest = new Map<number, number>()
  const groupsAt = (
    bbox: readonly [number, number, number, number],
    zoom: number
  ): MapClusterGroup[] =>
    indexes.flatMap((index, region) =>
      index.getClusters([...bbox], zoom).map(({ geometry, properties }) => {
        const [lng, lat] = geometry.coordinates as [number, number]
        const position = { lat, lng }
        if ('cluster' in properties)
          return {
            key: clusterKey(region, properties.cluster_id),
            position,
            value: properties.value,
            splitsAt: index.getClusterExpansionZoom(properties.cluster_id)
          }
        return { key: properties.key, position, value: properties.value }
      })
    )

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
      const cluster = parseClusterKey(group.key)
      if (!cluster) return []
      return indexes[cluster.region]!.getChildren(cluster.id).map(
        ({ properties }) => keyOf(cluster.region, properties)
      )
    },
    /** The places in a group, largest first. */
    placesIn(group: MapClusterGroup): ({ position: LatLng } & Place)[] {
      const cluster = parseClusterKey(group.key)
      if (!cluster)
        return places
          .filter(({ key }) => key === group.key)
          .map(({ region: _region, ...place }) => place)
      return indexes[cluster.region]!.getLeaves(cluster.id, Infinity)
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
