---
'@oztix/roadie-components': minor
---

`FileUpload` takes `pageDrop`, so files dropped anywhere on the page join the field. While they're dragged in, a full-window overlay names the field and counts the files ("Drop to add 3 files to Event documents"), and turns danger when every file is a type the field won't take, or when the field is full. It steps aside over a dropzone. A second field with `pageDrop` on the page warns in development.
