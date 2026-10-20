---
'@oztix/roadie-core': minor
---

Add `@oztix/roadie-core/records`, the model behind Roadie's record lists: fields, saved views, and the request a server reads, as plain TypeScript.

- `recordFields<Row>()` builds an entity's `RecordField`s with typed row keys: `text`, `option`, `location`, `number`, `money`, `date`, and `boolean`. A field says how it filters, sorts, and searches, how its dates compare (`event`, `access`, `timestamp`, or `date`), and its currency or format. A `location` field's places nest by `parent`, so is and is not mean is in and is not in.
- A `RecordView` saves a search, filters, sort, and layout as JSON under a `version`. `validateRecordView` checks one against its fields, and `equalRecordViews` tells whether one was modified.
- `resolveRecordQuery` fixes relative dates at a moment. `matchesRecordQuery` and `compileRecordQuery` filter rows in the browser, `sortRecords` sorts them, and `formatRecordValue` and `describeRecordFilter` write values and chips as a table shows them.
- `parseRecordQuery` reads typed text, such as "melb this weekend", "not sold out", or "capacity > 100", into ranked suggestions for `QueryField`.
- `recordViewToSearchParams` and `recordViewFromSearchParams` write and read a view and position as a versioned URL.
- A server reads a `RecordsRequest`, never a view: the query with relative dates fixed, the page's scope first, and its paging. `toRecordsRequest` builds one. `@oztix/roadie-core/records/json-schema`, `records/records-request.schema.json`, and `records/record-view.schema.json` give its JSON Schema, for servers that generate models.
- `@oztix/roadie-core/records/meilisearch` exports `toMeilisearch`, which turns a request into Meilisearch `q`, `filter`, `sort`, and paging. It needs Meilisearch 1.15 or later.
- `recordsToCsv` writes records as CSV and neutralises formula-like text. `recordPlaces` and `recordPlaceReader` list a record's places for a search index.

`RECORD_VIEW_VERSION`, `RECORD_URL_VERSION`, and `RECORDS_REQUEST_VERSION` name the three formats.
