---
'@oztix/roadie-components': patch
---

Update `RecordTable` row titles to wrap onto two lines before they're cut short, linked or not, instead of at one. A title linked with `getRowHref` keeps its strong text and underlines in the accent on hover, as a `DataTable` title does. A focused title rings its whole cell. A custom title `cell` now lays itself out the same way linked or not, so give it `truncate` to keep it on one line. Rows stay 48px tall, and narrow list rows are unchanged.
