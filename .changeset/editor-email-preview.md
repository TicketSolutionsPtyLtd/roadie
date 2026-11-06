---
'@oztix/roadie-editor': minor
---

Add Preview to the email editor, to see the email as it sends. With `onRenderPreview`, Preview in the docked toolbar and the floating toolbar's … menu shows the host's rendered HTML in a sandboxed frame in place of the canvas, at Desktop or Phone width, in Light or Dark. `previewRecipients` adds Preview as, which fills merge tags and checks conditions with a recipient's values, and `onSendTest` adds Send test, which sends the email as previewed to an address. `EmailHtmlField`'s preview shares the same frame. The frame scales to fit a phone, the bar keeps to one row, Dark simulates a mail app's forced dark mode and says so, and `sender` and `subject` show in an inbox row above the frame. `renderEmail` no longer sends empty paragraphs as blank lines. It drops empty list items, and lists left empty, too. Send test focuses its address field, and the inbox row darkens with the simulated dark mode.
