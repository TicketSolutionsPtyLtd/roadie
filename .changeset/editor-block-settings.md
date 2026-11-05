---
'@oztix/roadie-editor': minor
---

Add `settings` to an `extensions` block, so its view can show it as the page will rather than as a form. Settings leads the block's menu, and Enter on the selected block opens it: a drawer from the side, or from the bottom on a phone, with a field for each `text` or `choice` setting. Each change shows as it's made, Escape puts the block back, and Enter in a text setting or a click away keeps the changes as one undo step. A `choice` setting's `defaultValue` shows while its attr is unset. `EditorSetting` and `EditorSettingOption` are exported from `@oztix/roadie-editor/extensions`.

Settings also take `image` (`{ src, alt }`, with an upload through `onUploadImage`), `action` (`{ label, href }`), and `list` types: a list's items are added, removed, reordered with `Sortable`, and edited in their own folds. With a mouse, a click on a block with settings opens them at the text clicked, a list item included. The drawer has Done, says that Escape puts the block back, and makes that revert one undo step that Redo brings back. On a wide page it makes room for the block beside it.
