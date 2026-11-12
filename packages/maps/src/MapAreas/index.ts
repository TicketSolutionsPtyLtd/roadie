// Subpath entry for `@oztix/roadie-maps/map-areas`: areas on a `Map`
// coloured by their values, and `areaTotals` to add up points by area. Its
// own subpath, so a map without areas never loads it.
//
// NO `'use client'`: server-safe re-export layer.
export {
  MapAreas,
  type MapAreaInView,
  type MapAreaValue,
  type MapAreasProps
} from './MapAreas'
export { areaTotals } from './areaTotals'
export type {
  MapAreaCollection,
  MapAreaFeature,
  MapAreaTopology
} from './topology'
