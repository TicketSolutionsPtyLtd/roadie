---
'@oztix/roadie-core': minor
---

Add `toElasticsearch` on `@oztix/roadie-core/records/elasticsearch`, which turns a records request into Elasticsearch query DSL (`query`, `sort`, `from`, and `size`) that means the same as `matchesRecordQuery`. `paths` maps a field to the path filters and sort read, such as a `keyword` sub-field, and `searchFields` sets what search reads. `except` leaves out one field's chips, so a page can count that field's values against every other filter. It needs Elasticsearch 7.10 or later, or OpenSearch.
