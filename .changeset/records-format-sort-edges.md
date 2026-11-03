---
'@oztix/roadie-core': patch
---

Fix two records edge cases. `formatRecordValue` keeps a range's end when a plain-date start has an end held as an instant, reading it as a date in the row's zone, where it showed the start alone. `sortRecords` sorts booleans held as `"true"` and `"false"`, as Meilisearch stores them and filters already read them, where they sorted as empty.
