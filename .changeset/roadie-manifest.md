---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
'@oztix/roadie-charts': minor
---

Each package now ships `roadie.manifest.json`, a machine-readable catalogue for coding agents and tools. Import it from `@oztix/roadie-core/roadie.manifest.json`, `@oztix/roadie-components/roadie.manifest.json`, or `@oztix/roadie-charts/roadie.manifest.json`. It lists every export path with the values and types it exports, every component with its props in the order its source declares them, compound parts, and, where it has them, its docs page and first live example, every deprecated export and prop with its replacement, and, in core, the design tokens. The build generates it from the same source it publishes, so it always matches the installed version.
