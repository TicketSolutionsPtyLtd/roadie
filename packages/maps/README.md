# @oztix/roadie-maps

Maps of places for Oztix apps: where a venue is, pins and areas, choosing a
place, and totals by place as clusters or coloured areas. The
[docs](https://ticketsolutionsptyltd.github.io/roadie/components/map) are the
guide.

```bash
pnpm add @oztix/roadie-maps @oztix/roadie-components @oztix/roadie-core @phosphor-icons/react
```

```css
@import '@oztix/roadie-core/css';
@import '@oztix/roadie-components/css';
@import '@oztix/roadie-maps/css';
```

```tsx
import { Map } from '@oztix/roadie-maps/map'

;<Map
  defaultCenter={{ lat: -27.4575, lng: 153.0355 }}
  aria-label='Where the venue is'
>
  <Map.Marker position={{ lat: -27.4575, lng: 153.0355 }} label='The venue' />
</Map>
```

`MapClusters` and `MapAreas` show totals by place, from
`@oztix/roadie-maps/map-clusters` and `/map-areas`, so a map without them
never loads them.

`Map` draws with [MapLibre](https://maplibre.org/) and OpenFreeMap tiles,
loaded when a map first mounts, so it needs no API key or setup. Pass
`MapProvider` another engine or tiles for an app: `maplibreEngine` with tiles
of your own, or `googleEngine` from `@oztix/roadie-maps/map-google`.

## Working on it

- `src/Map/` is the `Map` compound and the MapLibre engine,
  `src/MapClusters/` and `src/MapAreas/` the layers that show totals, and
  `src/MapGoogle/` the Google engine. Every engine implements `MapEngine` in
  `src/Map/engine.ts` and passes `engine.contract.browser.test.tsx`.
- It builds on `@oztix/roadie-components` through its public subpaths only,
  never a file inside it.
- Tests run with `pnpm test:gated maps <file or folder>`.
