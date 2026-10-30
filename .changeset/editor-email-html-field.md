---
'@oztix/roadie-editor': minor
---

Add `EmailHtmlField` (`@oztix/roadie-editor/email-html-field`), the source of an email kept as HTML, with a preview at 600 pixels and on a phone. Pasting keeps the clipboard's HTML. The preview runs none of the email's scripts, and a script, an event handler or a `javascript:` link shows a warning in `Field.ErrorText`, but the HTML is saved as written, so the sending app's sanitiser stays the gate.
