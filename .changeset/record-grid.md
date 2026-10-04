---
'@oztix/roadie-components': minor
---

New `@oztix/roadie-components/record-grid` shows records as a grid of cards.
`gridLayout({ title, description, image, leading, trailing, details })` gives
`Records.Root` the grid layout, each part a field's key or `{ key, alt, cell }`.
Cards are at least 16rem wide, as many columns as fit and one on a phone, and
cards in a row share its height. The title carries `getRowHref`'s link,
`image` is a 16:9 banner, and `details` are label and value pairs. The grid
selects through Select mode with the bulk actions floating, and pages, windows
past 100 records by rows of cards, and loads by range as the table does, with
placeholders, range errors, and the loading, empty and error states.
`Records.Options` shows the grid's card fields: drag or use the Move menu to
reorder the shown ones, and an eye toggle to show or hide each field. They
write `view.layout.fields`, left out once back to the definition's details and
keeping keys for fields this grid doesn't have; with details defined, the last
one stays shown. `RecordGrid` puts the toolbar, grid, pagination and status
together, taking the card's parts and `gridActions` beside the options
`RecordTable` takes.
