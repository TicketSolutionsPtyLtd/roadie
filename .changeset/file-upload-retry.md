---
'@oztix/roadie-components': minor
---

`FileUpload.ItemRemove` reads Cancel while a file waits or uploads, and aborts the upload's `signal`. A failed upload turns its row `danger`, keeps what `onUpload` rejected with as the item's `error`, and is announced assertively. The new `FileUpload.ItemRetry` uploads it again without a new pick, and the default row shows it with a plain message.
