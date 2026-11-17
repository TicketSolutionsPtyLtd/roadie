// Makes docs/public/maps/example-sale-points.json, the sales the Map page's
// postcode example adds up. Every point is invented: seeded random numbers
// give each postcode a total, heavier near the larger cities, then scatter
// that many points inside it. No real sale or address goes in.
//
// Reads the built package, so build it first:
//   pnpm --filter @oztix/roadie-maps build
//   node docs/scripts/make-map-example-points.mjs [count] [file]
import { readFileSync, writeFileSync } from 'node:fs'

import { areaBox, areaContains } from '../../packages/maps/dist/Map/geometry.js'
import { areaTotals } from '../../packages/maps/dist/MapAreas/areaTotals.js'
import { areaFeatures } from '../../packages/maps/dist/MapAreas/topology.js'

const maps = new URL('../public/maps/', import.meta.url)
const count = Number(process.argv[2] ?? 12_000)
const file = process.argv[3] ?? new URL('example-sale-points.json', maps)

const boundaries = JSON.parse(
  readFileSync(new URL('postcodes-2021.topo.json', maps), 'utf8')
)
const postcodes = areaFeatures(boundaries).map((feature) => ({
  ...feature,
  box: areaBox(feature.geometry)
}))

// City centres, each with a weight and how far its pull reaches in km.
const hubs = [
  [153.03, -27.47, 260, 18],
  [153.42, -28.0, 150, 14],
  [153.07, -26.65, 90, 14],
  [151.21, -33.87, 300, 20],
  [151.78, -32.93, 110, 12],
  [144.96, -37.81, 320, 20],
  [138.6, -34.93, 160, 14],
  [115.86, -31.95, 170, 16],
  [147.33, -42.88, 90, 10],
  [130.84, -12.46, 60, 8],
  [149.13, -35.28, 110, 10],
  [153.6, -28.65, 70, 10],
  [145.77, -16.92, 50, 8],
  [146.82, -19.26, 45, 8],
  [144.28, -36.76, 50, 8],
  [143.85, -37.56, 50, 8]
]
const km = ([x1, y1], [x2, y2]) =>
  111 * Math.hypot((x1 - x2) * Math.cos((y1 * Math.PI) / 180), y1 - y2)

// A total for each postcode: the pull of the hubs on its middle, times a
// random factor, with a few extra here and there.
let totalsSeed = 7
const totalsRandom = () =>
  (totalsSeed = (totalsSeed * 16807) % 2147483647) / 2147483647
const totals = []
for (const { id, box } of postcodes) {
  const [west, south, east, north] = box
  const middle = [(west + east) / 2, (south + north) / 2]
  const pull = hubs.reduce(
    (sum, [x, y, weight, reach]) =>
      sum + weight * Math.exp(-km(middle, [x, y]) / reach),
    0
  )
  const value = Math.round(
    pull * (0.4 + totalsRandom() * 1.2) +
      (totalsRandom() < 0.08 ? totalsRandom() * 12 : 0)
  )
  // Fewer than 5 is left out, as a server would to keep small counts private.
  if (value >= 5) totals.push({ id, value })
}
totals.sort((a, b) => a.id.localeCompare(b.id))

// A point for each sale: a postcode picked by its total, then a random place
// in it, to three decimal places.
let pointsSeed = 20261110
const pointsRandom = () =>
  (pointsSeed = (pointsSeed * 1664525 + 1013904223) >>> 0) / 2 ** 32
const shapes = new Map(postcodes.map((postcode) => [postcode.id, postcode]))
const sum = totals.reduce((all, { value }) => all + value, 0)
const round = (degrees) => Number(degrees.toFixed(3))
const sales = []
while (sales.length < count) {
  let pick = pointsRandom() * sum
  const { id } = totals.find(({ value }) => (pick -= value) < 0) ?? totals[0]
  const { geometry, box } = shapes.get(id)
  const [west, south, east, north] = box
  // A place in the postcode's bounds that's inside its shape once rounded.
  for (let tries = 0; tries < 50; tries++) {
    const place = {
      lat: round(south + pointsRandom() * (north - south)),
      lng: round(west + pointsRandom() * (east - west))
    }
    if (!areaContains(geometry, place)) continue
    sales.push({
      latitude: place.lat.toFixed(3),
      longitude: place.lng.toFixed(3)
    })
    break
  }
}
writeFileSync(file, JSON.stringify(sales))

const placed = areaTotals(
  boundaries,
  sales.map(({ latitude, longitude }) => ({
    position: { lat: Number(latitude), lng: Number(longitude) }
  }))
)
console.log(
  `${sales.length} points in ${placed.length} of ${totals.length} postcodes with a total`
)
