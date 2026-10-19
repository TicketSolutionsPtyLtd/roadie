---
'roadie-skills': patch
---

Update `/roadie:build` and `/roadie:test` to match this release. `/roadie:build` covers records in server and range mode (`onRequestChange`, `loadRange`, `rowCountExact`), the versioned `RecordsRequest` a server reads with `toMeilisearch` and the JSON Schema, the one context object every action gets, location fields, and the calendar in the search dropdown. It adds `QueryField`, `Toolbar`, `Editor`, and `Link` to the component table, and says to pin alpha and beta APIs. `/roadie:test` drops file citations the audit's fixes removed, names the lint rule that now fails each test anti-pattern, and adds the WebKit hover (`pointAt`) and Firefox focus (`focusPage`) helpers for browser tests.
