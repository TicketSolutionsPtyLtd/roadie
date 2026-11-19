---
'@oztix/roadie-core': minor
---

Add `list`, `board`, `calendar`, and `map` to `RecordLayout`, so a saved view or a URL can hold them. A list takes `fields` and `groupBy`, a board `groupBy`, a calendar `dateField`, and a map nothing, since it fits its records. In a URL they're `layout=list&fields=&group=`, `layout=board&group=`, `layout=calendar&date=`, and `layout=map`. `validateRecordView` checks that `groupBy` names a single-valued field with options and `dateField` a date field that holds one date. `RECORD_VIEW_VERSION` and `RECORD_URL_VERSION` stay 1: older views and links read as before, and a release that doesn't know a layout falls back to its default view.
