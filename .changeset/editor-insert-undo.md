---
'@oztix/roadie-editor': patch
---

Undoing a block from the `/` menu goes back to the line as it was before the `/`, without leaving the typed `/command` behind, and redo brings the block back. Escape in the merge tag list that Merge tag in the `/` menu opens takes its `{{` back out, so `Hi /merge`, Enter, Escape leaves `Hi `; a `{{` you typed yourself stays.
