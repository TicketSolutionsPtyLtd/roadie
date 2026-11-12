import type { MapAreaGeometry } from '../Map/engine'

/** A boundary `MapAreas` draws: a GeoJSON polygon or multipolygon, by id. */
export type MapAreaFeature = {
  id: string
  geometry: MapAreaGeometry
}

type Position = [number, number]

/** GeoJSON features with ids, such as postcode boundaries. */
export type MapAreaCollection = {
  type: 'FeatureCollection'
  features: readonly {
    id?: string | number
    properties?: Record<string, unknown> | null
    geometry: MapAreaGeometry | { type: string } | null
  }[]
}

type TopologyGeometry =
  | { type: 'Polygon'; arcs: number[][]; id?: string | number }
  | { type: 'MultiPolygon'; arcs: number[][][]; id?: string | number }
  | { type: null | string; id?: string | number }

/**
 * TopoJSON: boundaries that share their edges, so neighbouring areas such
 * as postcodes store each border once. Often a third the size of GeoJSON.
 */
export type MapAreaTopology = {
  type: 'Topology'
  arcs: Position[][]
  transform?: { scale: Position; translate: Position }
  objects: Record<
    string,
    { type: 'GeometryCollection'; geometries: readonly TopologyGeometry[] }
  >
}

const isArea = (
  geometry: { type: string } | null
): geometry is MapAreaGeometry =>
  geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon'

/**
 * The areas in GeoJSON or TopoJSON, by id: each feature's `id`, or else the
 * property `idProperty` names. TopoJSON reads its first object unless given
 * one. Features without an id or an area are left out.
 */
export function areaFeatures(
  source: MapAreaCollection | MapAreaTopology,
  { idProperty, object }: { idProperty?: string; object?: string } = {}
): MapAreaFeature[] {
  if (source.type === 'Topology') return topologyFeatures(source, object)
  const features: MapAreaFeature[] = []
  for (const { id, properties, geometry } of source.features) {
    const key = idProperty ? properties?.[idProperty] : id
    if (key == null || !isArea(geometry)) continue
    features.push({ id: String(key), geometry })
  }
  return features
}

function topologyFeatures(
  topology: MapAreaTopology,
  object?: string
): MapAreaFeature[] {
  const collection = object
    ? topology.objects[object]
    : Object.values(topology.objects)[0]
  if (!collection) return []
  const [sx, sy] = topology.transform?.scale ?? [1, 1]
  const [tx, ty] = topology.transform?.translate ?? [0, 0]
  // Quantised arcs store each point as a step from the one before.
  const quantised = topology.transform !== undefined
  const arcs = topology.arcs.map((arc) => {
    let x = 0
    let y = 0
    return arc.map(([dx, dy]): Position => {
      if (!quantised) return [dx, dy]
      x += dx
      y += dy
      return [x * sx + tx, y * sy + ty]
    })
  })
  // A ring joins its arcs end to start; a negative index runs one backwards.
  const ring = (indexes: number[]) =>
    indexes.flatMap((index, i) => {
      const arc = index < 0 ? arcs[~index]!.toReversed() : arcs[index]!
      return i === 0 ? arc : arc.slice(1)
    })
  const features: MapAreaFeature[] = []
  for (const geometry of collection.geometries) {
    if (geometry.id == null) continue
    const id = String(geometry.id)
    if (geometry.type === 'Polygon' && 'arcs' in geometry)
      features.push({
        id,
        geometry: {
          type: 'Polygon',
          coordinates: (geometry.arcs as number[][]).map(ring)
        }
      })
    else if (geometry.type === 'MultiPolygon' && 'arcs' in geometry)
      features.push({
        id,
        geometry: {
          type: 'MultiPolygon',
          coordinates: (geometry.arcs as number[][][]).map((polygon) =>
            polygon.map(ring)
          )
        }
      })
  }
  return features
}
