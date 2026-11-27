---
'@oztix/roadie-components': minor
---

FileUpload: a full field (`maxFiles` files, when that's more than one) no longer opens the picker. Its dropzone reads "Remove a file to add another", and the dropzone and Trigger are disabled but stay focusable. While `validate` checks a file, the dropzone says "Checking rider.pdf…", the dropzone and Trigger are `aria-busy`, and the field has `data-checking`. The Move menu no longer counts rows still collapsing after a Remove, and a collapsing row stays under the row above it through a reorder. A disabled `Sortable.Item` can now sit outside `items` without a warning.
