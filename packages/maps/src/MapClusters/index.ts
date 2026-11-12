// Subpath entry for `@oztix/roadie-maps/map-clusters`: totals by place as
// bands on a `Map`. Its own subpath, so a map without clusters never loads
// it or its grouping library.
//
// NO `'use client'`: server-safe re-export layer.
export {
  MapClusters,
  type MapClusterBand,
  type MapClusterPoint,
  type MapClustersProps
} from './MapClusters'
