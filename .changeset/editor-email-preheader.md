---
'@oztix/roadie-editor': minor
---

Add a preheader to email designs. Preview text, above the email editor's canvas with a hint that about 40 to 90 characters show, saves the line an inbox shows after the subject as the doc's `preheader` attr, and `renderEmail` writes it as `mj-preview`, left out of the plain text, and Preview's inbox row shows it after the subject. Importing reads an `mj-preview`, or hidden text before any an HTML email shows, as the preheader rather than dropping it, and an import in place of the whole email keeps the email's own unless the source has one. A value with a preheader loses it when an earlier version of the editor saves it.
