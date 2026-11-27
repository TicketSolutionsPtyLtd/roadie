import type { MapPalette } from './engine'

// Roadie's basemap for OpenMapTiles vector tiles, such as OpenFreeMap's. It
// draws only what helps someone find a place: land, water, parks, buildings
// up close, roads, rail, borders, and place and street names. A numeric field
// a feature may lack gets a default, so tiles never warn.

const FONT = ['Noto Sans Regular']
const FONT_BOLD = ['Noto Sans Bold']

const MINOR_ROADS = ['minor', 'service', 'track']
const MAJOR_ROADS = ['primary', 'secondary', 'tertiary', 'trunk', 'motorway']

const width = (stops: [zoom: number, px: number][]) => [
  'interpolate',
  ['exponential', 1.5],
  ['zoom'],
  ...stops.flat()
]

export function roadieStyle(
  palette: MapPalette,
  source = 'https://tiles.openfreemap.org/planet',
  glyphs = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'
) {
  const tiles = { source: 'openmaptiles' }
  const roads = (classes: string[]) => [
    'match',
    ['get', 'class'],
    classes,
    true,
    false
  ]
  return {
    version: 8,
    name: 'Roadie',
    glyphs,
    sources: { openmaptiles: { type: 'vector', url: source } },
    layers: [
      {
        id: 'land',
        type: 'background',
        paint: { 'background-color': palette.land }
      },
      {
        id: 'park',
        type: 'fill',
        ...tiles,
        'source-layer': 'park',
        paint: { 'fill-color': palette.park }
      },
      {
        id: 'landcover',
        type: 'fill',
        ...tiles,
        'source-layer': 'landcover',
        filter: roads(['grass', 'wood']),
        paint: { 'fill-color': palette.park }
      },
      {
        id: 'water',
        type: 'fill',
        ...tiles,
        'source-layer': 'water',
        paint: { 'fill-color': palette.water }
      },
      {
        id: 'waterway',
        type: 'line',
        ...tiles,
        'source-layer': 'waterway',
        paint: { 'line-color': palette.water, 'line-width': 1 }
      },
      {
        id: 'building',
        type: 'fill',
        ...tiles,
        'source-layer': 'building',
        minzoom: 14,
        paint: { 'fill-color': palette.building }
      },
      {
        id: 'border',
        type: 'line',
        ...tiles,
        'source-layer': 'boundary',
        // A feature without a level counts as 0, so it neither shows nor warns.
        filter: [
          'match',
          ['coalesce', ['get', 'admin_level'], 0],
          [2, 4],
          true,
          false
        ],
        paint: {
          'line-color': palette.border,
          'line-width': 1,
          'line-dasharray': [3, 2]
        }
      },
      {
        id: 'road-minor',
        type: 'line',
        ...tiles,
        'source-layer': 'transportation',
        minzoom: 12,
        filter: roads(MINOR_ROADS),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': palette.road,
          'line-width': width([
            [12, 0.5],
            [18, 10]
          ])
        }
      },
      {
        id: 'road-major-casing',
        type: 'line',
        ...tiles,
        'source-layer': 'transportation',
        filter: roads(MAJOR_ROADS),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': palette.roadCasing,
          'line-width': width([
            [8, 1],
            [18, 18]
          ])
        }
      },
      {
        id: 'road-major',
        type: 'line',
        ...tiles,
        'source-layer': 'transportation',
        filter: roads(MAJOR_ROADS),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': palette.roadMajor,
          'line-width': width([
            [8, 0.5],
            [18, 15]
          ])
        }
      },
      {
        id: 'rail',
        type: 'line',
        ...tiles,
        'source-layer': 'transportation',
        filter: roads(['rail', 'transit']),
        paint: {
          'line-color': palette.rail,
          'line-width': 1,
          'line-dasharray': [2, 2]
        }
      },
      {
        id: 'street-name',
        type: 'symbol',
        ...tiles,
        'source-layer': 'transportation_name',
        minzoom: 14,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': FONT,
          'text-size': 11
        },
        paint: {
          'text-color': palette.label,
          'text-halo-color': palette.labelHalo,
          'text-halo-width': 1.5
        }
      },
      {
        id: 'water-name',
        type: 'symbol',
        ...tiles,
        'source-layer': 'water_name',
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': FONT,
          'text-size': 12
        },
        paint: {
          'text-color': palette.label,
          'text-halo-color': palette.labelHalo,
          'text-halo-width': 1.5
        }
      },
      {
        id: 'place-name',
        type: 'symbol',
        ...tiles,
        'source-layer': 'place',
        filter: roads(['city', 'town', 'suburb', 'neighbourhood', 'village']),
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': [
            'match',
            ['get', 'class'],
            ['city', 'town'],
            ['literal', FONT_BOLD],
            ['literal', FONT]
          ],
          'text-size': ['match', ['get', 'class'], 'city', 16, 'town', 14, 12]
        },
        paint: {
          'text-color': palette.label,
          'text-halo-color': palette.labelHalo,
          'text-halo-width': 1.5
        }
      }
    ]
  }
}
