---
'@oztix/roadie-editor': minor
---

Add `htmlToEditorValue(html, preset)` to `@oztix/roadie-editor/schema`, which imports existing HTML, such as CKEditor output, into an `EditorValue` the first time someone edits it. It keeps the text and drops styles, fonts and colours. In a paragraph, one `<br>` is a line break, and two start a new paragraph. Iframes an embed provider reads become embeds; pass `{ embedProviders }` to use the editor's own. It returns `{ value, dropped }`, where `dropped` lists each image, embed and media element it couldn't keep, so you can warn before overwriting legacy content. It needs a browser's `DOMParser`.
