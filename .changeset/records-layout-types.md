---
'@oztix/roadie-core': minor
---

Add `list`, `board`, `calendar`, and `map` to `RecordLayout`, so a saved view or a URL can hold them, and `groupBy` to every layout but calendar and map. `groupBy` lists the fields to group records by, outermost first, up to three; a board makes its columns from the first. A list takes `fields` and `groupBy`, a board `groupBy`, a calendar `dateField`, and a map nothing, since it fits its records. In a URL they're `layout=list&fields=&groupBy=a,b`, `layout=board&groupBy=`, `layout=calendar&dateField=`, and `layout=map`. `validateRecordView` checks that each `groupBy` level is a single-valued field with options, named once, and warns of a third level on a board, and that `dateField` is a date field that holds one date. `RECORD_VIEW_VERSION` and `RECORD_URL_VERSION` stay 1: older views and links read as before, and a release that doesn't know a layout falls back to its default view.
