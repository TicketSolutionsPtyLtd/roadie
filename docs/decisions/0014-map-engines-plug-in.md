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

MapLibre is pinned at 5.x: 6.x loads its worker from beside its own file,
which bundlers don't copy, while 5.x inlines it.

## Consequences

Apps pick an engine once, through `MapProvider`. `maplibreEngine` takes other
tiles, and `googleEngine` (`@oztix/roadie-components/map-google`) draws with
Google Maps, loading Google's script itself so Roadie needs no Google
package. A new engine is a subpath that implements `MapEngine` and must pass
the contract suite unchanged; `googleEngine` hasn't run it yet, since that
needs a key and spends Google Maps calls. Moving to MapLibre 6 means solving
its worker URL in every bundler first.

## Links

- Map series spec and grills (local, `.scratch/geo-map/`)
- Decision log draft: Oztix apps draw maps with Roadie's Map
