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
one, with keys that have no order last.

In core, `TableColumn` takes `kind: 'status'` and `status`, and
`validateDashboard` rejects an unknown intent and warns about keys a map lacks.
`columnStatus(column, key)` resolves a key's intent and label, and
`cellText(column, value)` gives any cell as the plain text its table shows. Both
also come from the Zod-free `@oztix/roadie-core/dashboard-layout`.
