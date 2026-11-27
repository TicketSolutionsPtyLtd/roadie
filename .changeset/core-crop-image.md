---
'@oztix/roadie-core': minor
---

`cropImage(source, value, { width?, type?, quality? })` in `@oztix/roadie-core/image` draws the crop an `ImageCrop` value describes, turned by its rotation, and returns it as a Blob. `source` is a File, Blob or URL. The output is the source's type unless you give `type`, or PNG where the browser can't encode it. It runs on an `OffscreenCanvas` where there is one.
