---
'@oztix/roadie-core': patch
---

Fix four records edge cases. A field keyed `constructor` or `toString` no longer matches the inherited member of a row that lacks it, and a `null` in a list no longer matches the option `"null"`. `validateRecordView` now flags a value with a backslash before a quote or at the end, which `toMeilisearch` can't write, instead of the adapter throwing at query time. On a seconds index, `toMeilisearch` writes a window shorter than a second as that second instead of an empty range.
