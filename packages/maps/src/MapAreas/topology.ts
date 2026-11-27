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

type TopologyGeometry = {
  id?: string | number
  properties?: Record<string, unknown> | null
} & (
  | { type: 'Polygon'; arcs: number[][] }
  | { type: 'MultiPolygon'; arcs: number[][][] }
  | { type: null | string }
)

/**
 * TopoJSON: boundaries that share their edges, so neighbouring areas such
 * as postcodes store each border once. Often a third the size of GeoJSON.
 */
export type MapAreaTopology = {
  type: 'Topology'
  // Points as plain arrays, as TopoJSON's own types and parsed JSON have them.
  arcs: readonly (readonly (readonly number[])[])[]
  transform?: { scale: readonly number[]; translate: readonly number[] }
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
 * The areas in GeoJSON or TopoJSON, by id: each one's `id`, or else the
 * property `idProperty` names. TopoJSON reads its first object. Those
 * without an id or an area are left out.
 */
export function areaFeatures(
  source: MapAreaCollection | MapAreaTopology,
  { idProperty }: { idProperty?: string } = {}
): MapAreaFeature[] {
  if (source.type === 'Topology') return topologyFeatures(source, idProperty)
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
  idProperty?: string
): MapAreaFeature[] {
  const collection = Object.values(topology.objects)[0]
  if (!collection) return []
  const [sx = 1, sy = 1] = topology.transform?.scale ?? []
  const [tx = 0, ty = 0] = topology.transform?.translate ?? []
  // Quantised arcs store each point as a step from the one before.
  const quantised = topology.transform !== undefined
  const arcs = topology.arcs.map((arc) => {
    let x = 0
    let y = 0
    return arc.map(([dx = 0, dy = 0]): Position => {
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
    const key = idProperty ? geometry.properties?.[idProperty] : geometry.id
    if (key == null) continue
    const id = String(key)
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
