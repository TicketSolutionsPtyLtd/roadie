---
'@oztix/roadie-editor': minor
---

Add `htmlToEditorValue(html, preset)` to `@oztix/roadie-editor/schema`, which imports existing HTML, such as CKEditor output, into an `EditorValue` the first time someone edits it. It keeps all the text and drops styles, fonts and colours. One `<br>` is a line break, and two start a new paragraph. Iframes a default embed provider reads become embeds. It returns `{ value, dropped }`, where `dropped` lists each image, embed and media element it couldn't keep, so you can warn before overwriting legacy content. It needs a browser's `DOMParser`.
