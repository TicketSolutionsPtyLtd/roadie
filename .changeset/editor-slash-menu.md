---
'@oztix/roadie-editor': minor
---

Add the insert menu to the `blocks` preset: type `/` to insert a paragraph, a heading, a list, a quote, a divider, an image, an embed, or a table, filtered as you type.

It's the same menu as the `email` preset's. Image adds an image from its link, as Image settings says, and Embed opens the Embed popover. In both presets the menu now offers only the blocks that fit once the typed `/` is gone, closes when focus leaves the editor, and leaves Shift+Enter or Mod+Enter to break the line. One undo takes a block the menu inserts back to the line as it was before the `/`, without the typed `/command`, and redo brings the block back.
