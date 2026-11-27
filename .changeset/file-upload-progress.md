---
'@oztix/roadie-components': minor
---

`FileUpload` takes `onUpload(file, { signal, onProgress })` and uploads each file added after mount, three at a time. `FileUpload.List` items carry `status` (`idle`, `queued`, `uploading`, `done` or `error`), `progress` and the upload's `result`. The new `FileUpload.ItemStatus` lays a progress ring over `FileUpload.ItemPreview` and pops in a check once the file has uploaded, the row shows a hairline as it uploads, and a polite live region says what was added and uploaded.
