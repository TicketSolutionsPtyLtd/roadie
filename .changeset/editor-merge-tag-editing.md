---
'@oztix/roadie-editor': minor
---

Add and edit merge tags in the email editor. With `variables`, typing `{{` lists them under the caret, filtered as you type, and Merge tag in the `/` menu opens the same list. Escape in a list that Merge tag opened takes its `{{` back out, so `Hi /merge`, Enter, Escape leaves `Hi `; a `{{` you typed yourself stays. A selected merge tag has its own toolbar, whose Edit merge tag changes the variable it shows and its fallback as you make each change, kept as one undo step, Escape included, and Remove merge tag removes it.
