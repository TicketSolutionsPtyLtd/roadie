---
'@oztix/roadie-components': minor
---

`FileUpload` takes `validate(file)`, which checks a file once the other rules pass, such as an image's pixel size. It can be async. A message turns the file away with the new rejection code `invalid`, shown in `Field.ErrorText` and passed to `onReject`.
