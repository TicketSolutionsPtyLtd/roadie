---
'@oztix/roadie-components': minor
---

Add `FileUpload.List`, which shows the chosen files one row each, with `FileUpload.Item`, `.ItemName`, `.ItemSize` and `.ItemRemove` to compose a row from a child function. With no children, `FileUpload` now renders the list under its dropzone, and the dropzone no longer shows the file in its own text. Rows pop in, a removed row fades and collapses before it goes, and focus moves to the next row's Remove, or back to the dropzone.
