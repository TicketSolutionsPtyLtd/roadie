---
'@oztix/roadie-core': patch
---

Fix four records edge cases. A field keyed `constructor` or `toString` no longer matches the inherited member of a row that lacks it, and a `null` in a list no longer matches the option `"null"`. `validateRecordView` now warns of a value with an unpaired backslash before a quote or at the end, which Meilisearch can't hold and `toMeilisearch` throws on, so a Meilisearch app can catch it before query time. The view stays valid for every other backend. On a seconds index, `toMeilisearch` writes a window shorter than a second as that second instead of an empty range.
