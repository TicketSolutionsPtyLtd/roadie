---
'@oztix/roadie-editor': minor
---

Add `Editor`'s `sections` prop, for designed sections in the `blocks` preset. Each `EditorSection` is plain data: its node `name`, `attrs` with their starting values, `settings`, `templates`, and a `render` that draws it as the page does and doubles as its `nodeMapping` entry. A section shows as it renders, with its links out of reach, and is edited in its Settings drawer. Its templates list under Sections in `/` and in the Blocks drawer, each tile with its `thumbnail`. A setting's `available` shows it only while the block's attrs call for it.
