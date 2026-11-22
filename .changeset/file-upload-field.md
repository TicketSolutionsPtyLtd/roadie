---
'@oztix/roadie-components': minor
---

Add `FileUpload` (`@oztix/roadie-components/file-upload`), a file field that checks each file before taking it. With no children it's `FileUpload.Dropzone`, which takes a dropped file, opens the picker on a click, Enter or Space, and shows the chosen file. For one plain file in a dense form, compose the bar instead from `FileUpload.Control`, `.Value`, `.Clear` and `.Trigger`; it takes drops too. Pasting a file anywhere inside the field adds it. The value is a `File[]` that a form posts under `name`, and `accept`, `maxFileSize` and `minFileSize` turn files away with a code and a message that shows in `Field.ErrorText`.
