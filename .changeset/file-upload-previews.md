---
'@oztix/roadie-components': minor
---

Add `FileUpload.ItemPreview`, and show it in the default list row. An image's preview is scaled to cover its tile and shows once it has decoded, and its object URL is revoked when the row goes; any other file gets an icon for its type (PDF, CSV or text). The docs show it as a single-image slot: the dropzone and the preview stacked in a 2:1 box.
