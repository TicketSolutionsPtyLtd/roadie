---
'@oztix/roadie-editor': minor
---

Add Import HTML or MJML to the `email` preset's toolbar, to bring an existing email across by pasting its source.

The dialog reads MJML, from its `<mjml>` root, or HTML, whole or in part, and lists what won't come across before anything changes: styles, a table's layout, images not on https, hidden text such as a preheader, and merge tags the editor doesn't know. It fills an empty email, or goes below the cursor or in place of the whole email, which undo reverses. Markup pasted as text opens it filled in. MJML sections, columns, buttons, images, spacers, and dividers become the editor's own, and each token from `variables`, such as `#FirstName#` or `{{ customer.first_name | default: "there" }}`, becomes its merge tag or link variable.

`importEmail` and `emailSourceFormat` from `@oztix/roadie-editor/schema` do the same outside the editor, in a browser, without the `mjml` package. `htmlToEditorValue` in the `email` preset now keeps images inside a table layout's cells, keeps a nested table's cells on lines of their own, and reports an image on a path of the site, which a mail client can't load, in place of dropping it unreported.
