---
'@oztix/roadie-components': minor
---

Add `FileUpload` (`@oztix/roadie-components/file-upload`), a file field that checks each file before taking it. With no children it's a bar, with the file's name on the left and a button on the right, built from `FileUpload.Control`, `.Value`, `.Clear` and `.Trigger`. The value is a `File[]` that a form posts under `name`, and `accept`, `maxFileSize` and `minFileSize` turn files away with a code and a message that shows in `Field.ErrorText`.
