---
'@oztix/roadie-components': patch
---

A Server Component that imports `@oztix/roadie-components/record-table` no longer loads RecordTable's row component, which calls React hooks the server build of React doesn't have.
