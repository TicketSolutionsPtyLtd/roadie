---
'@oztix/roadie-components': minor
---

`FileUpload` takes several files with `maxFiles`. Above 1, picks, drops and pastes add to the files, the dropzone counts them ("2 of 6"), and a file past the limit is turned away with the new `too-many` rejection code. Each `FileUpload.Item` then leads with a `Sortable` handle, so the files reorder by drag or from its Move menu. `FileUpload.List` is now named by the field's label.
