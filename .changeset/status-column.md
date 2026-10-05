---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
---

Tables take a `status` column kind. The value is a status key, and the column's
`status` map gives each key an intent and an optional label, which defaults to
the key in sentence case, so `on_sale` reads "On sale". A key the map lacks
shows as neutral, in its raw text.

`DataTable` shows it as a small `Badge` in normal emphasis, or as the label in
a `plain` table. It sorts by label, or by each key's `order` when the map gives
one, with keys that have no order last. An empty status shows the column's
`emptyText` and sorts last. A `secondaryKey` adds a line under the badge,
styled and wrapped as it is on a text column.

In core, `TableColumn` takes `kind: 'status'` and `status`, and
`validateDashboard` rejects an unknown intent and warns about keys a map lacks.
`columnStatus(column, key)` resolves a key's intent and label, and
`cellText(column, value)` gives any cell as the plain text its table shows,
and `humaniseStatus(key)` gives a key's default label. They come with the
`STATUS_INTENTS`, `StatusIntent`, `TableStatus` and `ResolvedStatus` types, and
also from the Zod-free `@oztix/roadie-core/dashboard-layout`. A `status` map on
a column of another kind gets a warning. `COLUMN_KINDS` gains `'status'`, so an
exhaustive `switch` over a column's `kind` needs a case for it.
