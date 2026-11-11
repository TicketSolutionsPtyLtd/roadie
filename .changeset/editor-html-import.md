---
'@oztix/roadie-editor': minor
---

Add `htmlToEditorValue(html, preset)` to `@oztix/roadie-editor/schema`, which imports existing HTML, such as CKEditor output, into an `EditorValue` the first time someone edits it. It keeps the text and drops styles, fonts and colours. In a paragraph, one `<br>` is a line break, and two start a new paragraph. Iframes an embed provider reads become embeds; pass `{ embedProviders }` to use the editor's own. It returns `{ value, dropped }`, where `dropped` lists each image, embed and media element it couldn't keep, including images in `basic` and images and players in a table cell, so you can warn before overwriting legacy content. It reads into `basic`, `rich`, and `blocks`, and throws a `RangeError` for `email`, which `importEmail` reads with its preview text, buttons, columns, and merge tags. It needs a browser's `DOMParser`, so call it in an effect or event handler, not while rendering.
