---
'@oztix/roadie-components': patch
---

Fix `roadie.manifest.json` linking `Records` to the records foundation page, which only shares its name, instead of the RecordTable page that documents its props. Agents reading the manifest now land on its API reference. `Records` no longer takes the foundation page's description as its `summary`, since that page isn't its own.
