---
'@oztix/roadie-components': minor
---

Add `RecordGrid` (`@oztix/roadie-components/record-grid`), records as a grid of cards to search, filter, sort, and page through.

`gridLayout({ title, description, image, leading, trailing, details })` gives `Records.Root` the grid layout, each part a field's key or `{ key, alt, cell }`. Cards are at least 16rem wide, as many columns as fit, and `image` is a 16:9 banner. The grid selects through Select mode, and pages, loads by range, and renders only the rows near the screen past 100 records, as the table does. `Records.Options` shows, hides, and reorders the card's details. `RecordGrid` takes the card's parts as `card`, which needs a `title`, and the same records and header options as `RecordTable`.
