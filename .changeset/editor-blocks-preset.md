---
'@oztix/roadie-editor': minor
---

Add the `blocks` preset, for pages built from blocks, where every block keeps an id.

`preset='blocks'` holds everything `rich` does, and every block but a table's rows and cells saves a `blockId`. The editor gives a block without one an id when it loads, splits, or is pasted, and `onValueChange` reports it. `migrate` drops an id that isn't a non-empty string, or that an earlier block already uses. The renderers never write ids.
