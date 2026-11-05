---
'@oztix/roadie-editor': minor
---

Add `settings` to an `extensions` block, so its view can show it as the page will rather than as a form. Settings leads the block's menu, and Enter on the selected block opens it: a drawer from the side, or from the bottom on a phone, with a field for each `text` or `choice` setting. Each change shows as it's made, Escape puts the block back, and Enter in a text setting or a click away keeps the changes as one undo step. A `choice` setting's `defaultValue` shows while its attr is unset. `EditorSetting` and `EditorSettingOption` are exported from `@oztix/roadie-editor/extensions`.
