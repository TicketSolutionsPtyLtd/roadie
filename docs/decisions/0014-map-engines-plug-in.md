# 0014 Map engines plug in behind one contract

## Context

Apps need maps, and data providers tie their data to their own maps: Google
Places results must be shown on a Google map, and Mapbox search results on
Mapbox. Design systems with maps usually fix the engine (Salesforce on
Google, Carbon on Mapbox, Telerik on its own renderer), which would leave
those apps out. The grills for the Map series settled this.

## Decision

`Map` in `@oztix/roadie-components/map` draws through a `MapEngine`: mount (cancelled by an `AbortSignal`),
read and set the view, project and unproject, listen, and destroy, all in
Roadie types. MapLibre GL, with OpenFreeMap tiles, is built in and loads when
a map first mounts, so a map works with no setup. Tiles belong to the engine,
so an engine and tiles that can't work together can't be paired. Every engine
passes `engine.contract.browser.test.tsx`. Markers, previews and controls are
Roadie HTML over the map, so they look and behave the same on every engine.

MapLibre is 6.x, which draws in a worker loaded from a file of its own.
`maplibreEngine` points MapLibre at it with
`new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url)`, which
webpack, Turbopack and Vite builds serve as part of the app. Vite's dev
server pre-bundles Roadie and loses the file, so a Vite app passes
`workerUrl`, as does one on another bundler. An app that calls MapLibre's
`setWorkerUrl` itself keeps its own. MapLibre 5 inlined its worker, but no
5.x release has the fix for GHSA-jrc7-96c5-q579, an XSS in MapLibre's
credits control.

## Consequences

Apps pick an engine once, through `MapProvider`. `maplibreEngine` takes other
tiles, and `googleEngine` (`@oztix/roadie-components/map-google`) draws with
Google Maps, loading Google's script itself so Roadie needs no Google
package. A new engine is a subpath that implements `MapEngine` and must pass
the contract suite unchanged; `googleEngine` hasn't run it yet, since that
needs a key and spends Google Maps calls.

## Links

- Map series spec and grills (local, `.scratch/geo-map/`)
- Decision log draft: Oztix apps draw maps with Roadie's Map
